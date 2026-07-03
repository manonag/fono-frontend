'use client'

// Coexistence kiosk shell (CD handoff coexistence/coexist.jsx CoexistKiosk,
// CHIRAN arch fact #362). The SLA/Live kiosk for Live + voicemail tenants
// (call_setup_path === 'live' && voicemail_enabled === true, e.g. Thecha).
//
// Owns the single top tab bar (Missed / Recovered / Ignored / Voicemails), the
// New/Resolved/Hidden status segmented control (right-aligned, voicemail mode
// only), and the live <-> voicemail body swap with a 130ms cross-fade. The
// live surface is the real SLA call feed re-skinned to the receipt system
// (SlaCallList); the Voicemails tab renders the real Layout C treatment
// (NestedVoicemailSurface), superseding the plain T-310 panel.
//
// Routing gate (CRITICAL CORRECTION, arch fact #362): keyed off
// call_setup_path + voicemail_enabled, NOT routing_mode (which derives 'sla'
// for live tenants and so never satisfies the prototype's gate). The branch
// itself lives in kiosk/page.tsx; this component is rendered once that gate
// passes.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { config } from '@/lib/config'
import { useFonoToken } from '@/hooks/use-fono-token'
import { useImpersonation } from '@/lib/impersonation'
import { useRestaurant } from '@/lib/restaurant-context'
import {
  fetchVoicemails,
  markVoicemailSpam,
  patchVoicemailIntent,
  patchVoicemailStatus,
  requestVoicemailCallback,
  undoVoicemailSpam,
  unblockVoicemail,
} from '@/lib/api'
import type { KioskCall } from '@/app/kiosk/components/call-card'
import { deduplicateByCaller, sortMissedCalls } from '@/app/kiosk/components/call-sort'
import { formatClock, PUNCH_STATUSES, STATUSES, TAB_LABELS, tabCount } from '../helpers'
import { IconMoon, IconSun } from '../icons'
import { Toast } from '../Toast'
import type {
  CategoryFilter,
  IntentKey,
  Status,
  Tenant,
  Voicemail,
} from '../types'
import { CallConfirmModal } from './CallConfirmModal'
import { NestedVoicemailSurface } from './NestedVoicemailSurface'
import { ConfirmSheet, Legend, UndoToast } from './PunchExtras'
import type { PunchConfirm, PunchToast } from './PunchExtras'
import { SlaCallList } from './SlaCallList'
import styles from './coexist.module.css'
import punch from '../punch.module.css'

const POLL_INTERVAL_MS = 30000
const FADE_MS = 130

type TopTab = 'missed' | 'recovered' | 'ignored' | 'voicemails'

function applyStatus(v: Voicemail, status: Status): Voicemail {
  return {
    ...v,
    status,
    resolved_at: status === 'resolved' ? Date.now() : v.resolved_at,
    resolved_by: status === 'resolved' ? 'You' : v.resolved_by,
    hidden_at: status === 'hidden' ? Date.now() : v.hidden_at,
  }
}

export function CoexistKiosk({ tenant }: { tenant: Tenant }) {
  const token = useFonoToken()
  const imp = useImpersonation()
  const { current } = useRestaurant()
  const tenantTimezone = current.timezone
  const readOnly = imp.readOnly

  // The receipt aesthetic is paper-first, so light is the default theme.
  const [dark, setDark] = useState(false)
  const [topTab, setTopTab] = useState<TopTab>('missed')
  const [vmStatus, setVmStatus] = useState<Status>('new')
  const [vmCategory, setVmCategory] = useState<CategoryFilter>('all')
  const [fading, setFading] = useState(false)

  const [missedCalls, setMissedCalls] = useState<KioskCall[]>([])
  const [recoveredCalls, setRecoveredCalls] = useState<KioskCall[]>([])
  const [ignoredCalls, setIgnoredCalls] = useState<KioskCall[]>([])
  const [voicemails, setVoicemails] = useState<Voicemail[]>([])
  const [loading, setLoading] = useState(true)
  const [syncAt, setSyncAt] = useState<number | null>(null)

  // Local clock — 0 until mounted so SSR and first client render match.
  const [now, setNow] = useState(0)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const [confirmCall, setConfirmCall] = useState<KioskCall | null>(null)
  const [callbackLoading, setCallbackLoading] = useState(false)
  // Voicemail card callback (same bridge as the missed-call CALL BACK).
  const [confirmVmCall, setConfirmVmCall] = useState<{ id: string; phone: string } | null>(null)
  const [vmCallLoading, setVmCallLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const fadeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const showToast = useCallback((message: string) => setToast(message), [])
  const dismissToast = useCallback(() => setToast(null), [])

  // ── T-418 punch surface (gated on the single spam_blocklist_enabled flag).
  // Every punch branch below is inert when off, so the flag-off surface is
  // byte-identical to today. ─────────────────────────────────────────────
  const punchOn = tenant.spam_blocklist_enabled === true
  const [confirm, setConfirm] = useState<PunchConfirm>(null)
  const [spamToast, setSpamToast] = useState<PunchToast>(null)
  const [legendOpen, setLegendOpen] = useState(false)
  const [justArrivedIds, setJustArrivedIds] = useState<string[]>([])
  const [badgeFlash, setBadgeFlash] = useState(false)
  const spamToastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const seenNewIds = useRef<Set<string>>(new Set())
  const seededArrival = useRef(false)

  const markSeen = useCallback(
    (id: string) => setJustArrivedIds((ids) => ids.filter((i) => i !== id)),
    [],
  )

  // Arrival detection (item 3): the first load seeds the seen-set without a
  // flash; later polls mark genuinely new 'new' voicemails as just-arrived
  // (card ring + New-tab badge pulse), clearing after 45s.
  useEffect(() => {
    if (!punchOn) return
    const ids = voicemails.filter((v) => v.status === 'new').map((v) => v.id)
    if (!seededArrival.current) {
      seededArrival.current = true
      seenNewIds.current = new Set(ids)
      return
    }
    const fresh = ids.filter((id) => !seenNewIds.current.has(id))
    if (fresh.length === 0) return
    fresh.forEach((id) => seenNewIds.current.add(id))
    setJustArrivedIds((prev) => [...prev, ...fresh])
    setBadgeFlash(true)
    const badgeTimer = setTimeout(() => setBadgeFlash(false), 6500)
    const clearTimers = fresh.map((id) => setTimeout(() => markSeen(id), 45000))
    return () => {
      clearTimeout(badgeTimer)
      clearTimers.forEach(clearTimeout)
    }
  }, [voicemails, punchOn, markSeen])

  const requestSpam = useCallback((vm: Voicemail) => setConfirm({ kind: 'spam', vm }), [])
  const requestUnblock = useCallback((vm: Voicemail) => setConfirm({ kind: 'unblock', vm }), [])

  // Spam commit: optimistic status+block, 6s undo toast; roll back + toast on
  // API failure. undo restores the exact prior status and unblocks.
  const commitSpam = useCallback(async () => {
    if (!confirm || confirm.kind !== 'spam') return
    const vm = confirm.vm
    const prevStatus = vm.status
    setConfirm(null)
    markSeen(vm.id)
    const snapshot = voicemails
    setVoicemails((vs) =>
      vs.map((v) =>
        v.id === vm.id
          ? { ...v, status: 'spam' as Status, blocked: true, spam_at: Date.now(), spam_by: 'You' }
          : v,
      ),
    )
    clearTimeout(spamToastTimer.current)
    setSpamToast({ key: Date.now(), phone: vm.caller_phone, vmId: vm.id, prevStatus })
    spamToastTimer.current = setTimeout(() => setSpamToast(null), 6000)
    try {
      await markVoicemailSpam(vm.id, token)
    } catch {
      setVoicemails(snapshot)
      setSpamToast(null)
      showToast('Could not mark spam. Reverted.')
    }
  }, [confirm, voicemails, token, markSeen, showToast])

  const undoSpam = useCallback(async () => {
    if (!spamToast) return
    clearTimeout(spamToastTimer.current)
    const { vmId, prevStatus } = spamToast
    const snapshot = voicemails
    setVoicemails((vs) =>
      vs.map((v) =>
        v.id === vmId
          ? { ...v, status: prevStatus as Status, blocked: false, spam_at: undefined, spam_by: undefined }
          : v,
      ),
    )
    setSpamToast(null)
    try {
      await undoVoicemailSpam(vmId, token)
    } catch {
      setVoicemails(snapshot)
      showToast('Could not undo. Reverted.')
    }
  }, [spamToast, voicemails, token, showToast])

  const commitUnblock = useCallback(async () => {
    if (!confirm || confirm.kind !== 'unblock') return
    const vm = confirm.vm
    setConfirm(null)
    const snapshot = voicemails
    setVoicemails((vs) =>
      vs.map((v) =>
        v.id === vm.id
          ? { ...v, status: 'new' as Status, blocked: false, spam_at: undefined, spam_by: undefined }
          : v,
      ),
    )
    try {
      await unblockVoicemail(vm.id, token)
    } catch {
      setVoicemails(snapshot)
      showToast('Could not unblock. Reverted.')
    }
  }, [confirm, voicemails, token, showToast])

  // ── data load + poll ──────────────────────────────────────────────────
  const fetchTab = useCallback(
    async (tab: string): Promise<KioskCall[]> => {
      if (!token) return []
      try {
        const res = await fetch(
          `${config.apiUrl}/api/v1/tenants/${tenant.id}/kiosk/calls?tab=${tab}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) return []
        return (await res.json()) as KioskCall[]
      } catch {
        return []
      }
    },
    [tenant.id, token],
  )

  const load = useCallback(async () => {
    if (!token) return
    const [missed, recovered, ignored, vms] = await Promise.all([
      fetchTab('missed'),
      fetchTab('recovered'),
      fetchTab('ignored'),
      fetchVoicemails(tenant.id, token),
    ])
    setMissedCalls(missed)
    setRecoveredCalls(recovered)
    setIgnoredCalls(ignored)
    setVoicemails(vms)
    setSyncAt(Date.now())
    setLoading(false)
  }, [fetchTab, tenant.id, token])

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    const id = setInterval(() => void load(), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => () => clearTimeout(fadeTimer.current), [])

  // Keep the screen awake (parity with the standalone kiosks).
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null
    async function request() {
      try {
        if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen')
      } catch {
        // unsupported or denied
      }
    }
    void request()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      void wakeLock?.release()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // ── derived ───────────────────────────────────────────────────────────
  const dedupedMissed = useMemo(() => deduplicateByCaller(missedCalls), [missedCalls])
  const dedupedRecovered = useMemo(() => deduplicateByCaller(recoveredCalls), [recoveredCalls])
  const dedupedIgnored = useMemo(() => deduplicateByCaller(ignoredCalls), [ignoredCalls])
  const sortedMissed = useMemo(
    () => sortMissedCalls(dedupedMissed),
    // `now` re-sorts the queue as SLA timers tick (breached-first ordering).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dedupedMissed, now],
  )

  // sla_enabled === false -> voicemail-led: the body is ALWAYS the nested
  // voicemail surface (topTab is irrelevant), and the live tabs/segmented are
  // replaced by promoted status tabs. See CD sla_off delta brief.
  const inVoicemail = !tenant.sla_enabled || topTab === 'voicemails'
  const liveCount = useCallback(
    (t: TopTab) =>
      t === 'missed'
        ? dedupedMissed.length
        : t === 'recovered'
          ? dedupedRecovered.length
          : dedupedIgnored.length,
    [dedupedMissed.length, dedupedRecovered.length, dedupedIgnored.length],
  )
  const vmNewCount = useMemo(() => tabCount(voicemails, 'new'), [voicemails])
  const statusOptions = useMemo(
    () =>
      (punchOn ? PUNCH_STATUSES : STATUSES).map((s) => ({
        value: s,
        label: TAB_LABELS[s],
        count: tabCount(voicemails, s),
      })),
    [voicemails, punchOn],
  )

  const syncSeconds = syncAt !== null && now > 0 ? Math.max(0, Math.floor((now - syncAt) / 1000)) : null

  // ── tab switch with cross-fade ────────────────────────────────────────
  const switchTab = useCallback(
    (t: TopTab) => {
      if (t === topTab) return
      setFading(true)
      clearTimeout(fadeTimer.current)
      fadeTimer.current = setTimeout(() => {
        setTopTab(t)
        setFading(false)
      }, FADE_MS)
    },
    [topTab],
  )

  // ── live-call mutations ───────────────────────────────────────────────
  const handleCallBack = useCallback((call: KioskCall) => setConfirmCall(call), [])

  const handleConfirmCallback = useCallback(async () => {
    if (readOnly || !confirmCall || !token) return
    setCallbackLoading(true)
    const callToAct = confirmCall
    setConfirmCall(null)
    try {
      const res = await fetch(
        `${config.apiUrl}/api/v1/calls/${callToAct.id}/callback?action=call`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.detail || 'Callback failed')
        setCallbackLoading(false)
        return
      }
    } catch {
      showToast('Callback failed')
      setCallbackLoading(false)
      return
    }
    setMissedCalls((prev) =>
      prev.map((c) =>
        c.caller_phone === callToAct.caller_phone
          ? { ...c, callback_status: 'calling' as const }
          : c,
      ),
    )
    showToast(`Calling ${callToAct.caller_phone}…`)
    setCallbackLoading(false)
  }, [readOnly, confirmCall, token, showToast])

  const handleIgnore = useCallback(
    async (call: KioskCall) => {
      if (readOnly || !token) return
      try {
        const res = await fetch(
          `${config.apiUrl}/api/v1/calls/${call.id}/callback?action=ignore`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) {
          showToast('Failed to ignore call')
          return
        }
      } catch {
        showToast('Failed to ignore call')
        return
      }
      setMissedCalls((prev) => prev.filter((c) => c.caller_phone !== call.caller_phone))
      setIgnoredCalls((prev) => [
        { ...call, callback_status: 'ignored' as const, callback_at: new Date().toISOString() },
        ...prev,
      ])
      showToast(`Ignored ${call.caller_phone}`)
    },
    [readOnly, token, showToast],
  )

  // ── voicemail mutations (optimistic + rollback, parity with KioskPage) ─
  const onStatusChange = useCallback(
    async (id: string, status: Status) => {
      if (readOnly) return
      const snapshot = voicemails
      setVoicemails((prev) => prev.map((v) => (v.id === id ? applyStatus(v, status) : v)))
      try {
        await patchVoicemailStatus(id, status, token)
      } catch {
        setVoicemails(snapshot)
        showToast('Could not update the voicemail. Reverted.')
      }
    },
    [readOnly, voicemails, token, showToast],
  )

  const onReclassify = useCallback(
    async (id: string, key: IntentKey) => {
      if (readOnly) return
      const display = tenant.categories.find((c) => c.key === key)?.display ?? key
      const snapshot = voicemails
      setVoicemails((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, intent_category_key: key, intent_category_display_at_capture: display }
            : v,
        ),
      )
      try {
        await patchVoicemailIntent(id, key, token)
      } catch {
        setVoicemails(snapshot)
        showToast('Could not reclassify the voicemail. Reverted.')
      }
    },
    [readOnly, voicemails, tenant.categories, token, showToast],
  )

  // Voicemail card callback: open the confirm-bridge modal, then POST to the
  // outbound bridge (dials the caller first, connects the team on answer) —
  // same flow as the missed-call CALL BACK, keyed on the voicemail id.
  const handleVmCall = useCallback(
    (id: string) => {
      const vm = voicemails.find((v) => v.id === id)
      if (vm) setConfirmVmCall({ id, phone: vm.caller_phone })
    },
    [voicemails],
  )

  const handleConfirmVmCallback = useCallback(async () => {
    if (readOnly || !confirmVmCall || !token) return
    setVmCallLoading(true)
    const target = confirmVmCall
    setConfirmVmCall(null)
    try {
      await requestVoicemailCallback(target.id, token)
    } catch {
      showToast('Callback failed')
      setVmCallLoading(false)
      return
    }
    showToast(`Calling ${target.phone}…`)
    setVmCallLoading(false)
  }, [readOnly, confirmVmCall, token, showToast])

  const liveTab = inVoicemail ? 'missed' : topTab
  const liveCalls =
    liveTab === 'missed' ? sortedMissed : liveTab === 'recovered' ? dedupedRecovered : dedupedIgnored

  return (
    <div className={styles.frame} data-theme={dark ? 'dark' : 'light'}>
      {/* ── Header ── */}
      <header className={styles.head}>
        <span className={styles.logo} aria-label="fono">
          f<span className={styles.logoDot} aria-hidden="true" />no
        </span>
        <span className={styles.tenant}>
          <span className={styles.tenantName}>{tenant.name}</span>
          <span className={styles.tenantTag}>
            {tenant.sla_enabled ? 'Live + Voicemail' : 'Voicemail'}
          </span>
        </span>
        <span className={styles.live} title={syncSeconds === null ? 'Live' : `Last sync ${syncSeconds}s ago`}>
          <span className={styles.liveDot} aria-hidden="true" /> Live
          {syncSeconds !== null ? ` · last sync ${String(syncSeconds).padStart(2, '0')}s` : ''}
        </span>
        <span className={styles.clock}>{now > 0 ? formatClock(now) : ''}</span>
        <button
          type="button"
          className={styles.theme}
          onClick={() => setDark((d) => !d)}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <IconSun w={14} h={14} /> : <IconMoon w={14} h={14} />}
        </button>
      </header>

      {/* ── Single top tab bar ── */}
      {/* sla_enabled: live tabs + divider + Voicemails tab + right-aligned
          segmented (as shipped). !sla_enabled (voicemail-led): VOICEMAILS
          surface label + divider + New/Resolved/Hidden promoted to primary
          sage tabs; no live tabs, no segmented. CD sla_off delta brief. */}
      <nav className={styles.tabs}>
        {tenant.sla_enabled ? (
          <>
            {(['missed', 'recovered', 'ignored'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={styles.tab}
                data-active={topTab === t ? 'true' : undefined}
                onClick={() => switchTab(t)}
              >
                {t === 'missed' ? 'Missed' : t === 'recovered' ? 'Recovered' : 'Ignored'}{' '}
                <span className={styles.tabCnt}>{String(liveCount(t)).padStart(2, '0')}</span>
              </button>
            ))}

            <span className={styles.tabDivider} aria-hidden="true" />

            <button
              type="button"
              className={`${styles.tab} ${styles.tabVm}`}
              data-active={inVoicemail ? 'true' : undefined}
              onClick={() => switchTab('voicemails')}
            >
              Voicemails <span className={styles.tabCnt}>{String(vmNewCount).padStart(2, '0')}</span>
            </button>

            {/* Status segmented — voicemail mode only, right-aligned. */}
            {inVoicemail ? (
              <span className={styles.statusSeg}>
                {statusOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    className={styles.segBtn}
                    data-active={vmStatus === o.value ? 'true' : undefined}
                    onClick={() => setVmStatus(o.value)}
                  >
                    {o.label} <span className={styles.segCnt}>{String(o.count).padStart(2, '0')}</span>
                  </button>
                ))}
              </span>
            ) : null}
          </>
        ) : (
          <>
            {/* Voicemail-led: the status tabs ARE the primary nav, wearing the
                sage voicemail accent. A quiet non-interactive surface label
                anchors the bar where the live tabs used to be. */}
            <span className={styles.surfaceLabel}>Voicemails</span>
            <span className={styles.tabDivider} aria-hidden="true" />
            {statusOptions.map((o) => {
              const active = vmStatus === o.value
              // Punch per-status accent (item 5): terra / blue / neutral / brick.
              const accent =
                o.value === 'new'
                  ? 'var(--rcp-terra)'
                  : o.value === 'resolved'
                    ? 'var(--p-resolved)'
                    : o.value === 'spam'
                      ? 'var(--p-spam)'
                      : 'var(--p-ignore)'
              return (
                <button
                  key={o.value}
                  type="button"
                  className={`${styles.tab} ${styles.tabVm}`}
                  data-active={active ? 'true' : undefined}
                  onClick={() => setVmStatus(o.value)}
                  {...(punchOn
                    ? { 'data-el': 'status-tab', 'data-status-tab': o.value }
                    : {})}
                  style={punchOn && active ? { borderBottomColor: accent } : undefined}
                >
                  {o.label}{' '}
                  <span
                    className={
                      punchOn && badgeFlash && o.value === 'new'
                        ? `${styles.tabCnt} ${punch.badgeFlash}`
                        : styles.tabCnt
                    }
                    style={
                      punchOn && active
                        ? { background: accent, color: o.value === 'ignore' ? '#1e0e00' : '#fff' }
                        : undefined
                    }
                  >
                    {String(o.count).padStart(2, '0')}
                  </span>
                </button>
              )
            })}
            {punchOn ? <Legend open={legendOpen} setOpen={setLegendOpen} /> : null}
          </>
        )}
      </nav>

      {/* ── Body (cross-fade) ── */}
      <main className={`${styles.body} ${fading ? styles.bodyFading : ''}`}>
        {loading ? (
          <div className={styles.liveBody} style={{ display: 'grid', placeItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                color: 'var(--rcp-brown)',
              }}
            >
              Loading…
            </span>
          </div>
        ) : inVoicemail ? (
          <NestedVoicemailSurface
            tab={vmStatus}
            category={vmCategory}
            setCategory={setVmCategory}
            voicemails={voicemails}
            categories={tenant.categories}
            dark={dark}
            onStatusChange={onStatusChange}
            onReclassify={onReclassify}
            readOnly={readOnly}
            onCall={readOnly ? undefined : handleVmCall}
            punch={punchOn}
            onSpamRequest={punchOn && !readOnly ? requestSpam : undefined}
            onUnblockRequest={punchOn && !readOnly ? requestUnblock : undefined}
            justArrivedIds={punchOn ? justArrivedIds : undefined}
            onSeen={punchOn ? markSeen : undefined}
          />
        ) : (
          <div className={styles.liveBody}>
            <SlaCallList
              calls={liveCalls}
              tab={liveTab}
              now={now}
              tenantTimezone={tenantTimezone}
              onCallBack={readOnly ? undefined : handleCallBack}
              onIgnore={readOnly ? undefined : handleIgnore}
            />
          </div>
        )}
      </main>

      {/* ── Callback confirm modals (missed-call + voicemail, same bridge) ── */}
      {confirmCall ? (
        <CallConfirmModal
          phone={confirmCall.caller_phone}
          dark={dark}
          busy={callbackLoading || readOnly}
          onCancel={() => setConfirmCall(null)}
          onConfirm={handleConfirmCallback}
        />
      ) : null}
      {confirmVmCall ? (
        <CallConfirmModal
          phone={confirmVmCall.phone}
          dark={dark}
          busy={vmCallLoading || readOnly}
          onCancel={() => setConfirmVmCall(null)}
          onConfirm={handleConfirmVmCallback}
        />
      ) : null}

      {toast ? <Toast message={toast} onDismiss={dismissToast} /> : null}

      {/* ── T-418 punch overlays (spam/unblock confirm + undo toast) ── */}
      {punchOn ? (
        <>
          <ConfirmSheet
            confirm={confirm}
            tenantName={tenant.name}
            onConfirm={confirm?.kind === 'spam' ? commitSpam : commitUnblock}
            onCancel={() => setConfirm(null)}
          />
          <UndoToast toast={spamToast} onUndo={undoSpam} />
        </>
      ) : null}
    </div>
  )
}
