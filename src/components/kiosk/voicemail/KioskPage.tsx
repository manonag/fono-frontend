'use client'

// Page-level component for the voicemail-route kiosk (Direction A - receipt).
// Owns the top-level state (current tab, fetched voicemails, theme, sync
// time, toast) and the optimistic mutation handlers. Renders the header
// chrome, tabs, list, and footer stamp.
//
// Tenant identity arrives as a prop - this component never reads it from
// the session directly. The route-level page (src/app/kiosk/page.tsx)
// resolves it from the impersonation context or the session and passes it
// down (CHIRAN principle #49 / brief section 7).

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchVoicemails, patchVoicemailIntent, patchVoicemailStatus } from '@/lib/api'
import { useFonoToken } from '@/hooks/use-fono-token'
import { cn } from '@/lib/utils'
import { formatClockWithSeconds, tabCounts } from './helpers'
import { useClock } from './hooks'
import { IconMoon, IconSun } from './icons'
import styles from './styles.module.css'
import { Toast } from './Toast'
import { VoicemailList } from './VoicemailList'
import { VoicemailTabs } from './VoicemailTabs'
import type { IntentKey, KioskPageProps, Status, Voicemail } from './types'

// Background refresh cadence. Matches the existing SLA kiosk; real-time
// push of new voicemails is out of scope (brief section 9).
const POLL_INTERVAL_MS = 30000

function applyStatus(v: Voicemail, status: Status): Voicemail {
  return {
    ...v,
    status,
    resolved_at: status === 'resolved' ? Date.now() : v.resolved_at,
    resolved_by: status === 'resolved' ? 'You' : v.resolved_by,
    hidden_at: status === 'hidden' ? Date.now() : v.hidden_at,
  }
}

export function KioskPage({ tenant }: KioskPageProps) {
  const token = useFonoToken()
  // `now` is 0 until mounted; locale-formatted output is gated on it.
  const now = useClock()

  const [tab, setTab] = useState<Status>('new')
  const [voicemails, setVoicemails] = useState<Voicemail[]>([])
  const [loading, setLoading] = useState(true)
  const [syncAt, setSyncAt] = useState<number | null>(null)
  // The receipt aesthetic is paper-first, so light is the default theme.
  const [dark, setDark] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // --- data load (mock-backed until the voicemail backend ships) + poll ---
  const load = useCallback(async () => {
    const data = await fetchVoicemails(tenant.id, token)
    setVoicemails(data)
    setSyncAt(Date.now())
    setLoading(false)
  }, [tenant.id, token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = setInterval(() => {
      void load()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  // --- mutations: optimistic update, persist, roll back + toast on error --
  const dismissToast = useCallback(() => setToast(null), [])

  const onStatusChange = useCallback(
    async (id: string, status: Status) => {
      // Snapshot for rollback. Event handlers always run the latest
      // callback instance, so this closes over the current voicemails.
      const snapshot = voicemails
      setVoicemails((prev) => prev.map((v) => (v.id === id ? applyStatus(v, status) : v)))
      try {
        await patchVoicemailStatus(id, status, token)
      } catch {
        setVoicemails(snapshot)
        setToast('Could not update the voicemail. Reverted.')
      }
    },
    [voicemails, token],
  )

  const onReclassify = useCallback(
    async (id: string, key: IntentKey) => {
      const display = tenant.categories.find((c) => c.key === key)?.display ?? key
      const snapshot = voicemails
      setVoicemails((prev) =>
        prev.map((v) =>
          v.id === id
            ? {
                ...v,
                intent_category_key: key,
                intent_category_display_at_capture: display,
              }
            : v,
        ),
      )
      try {
        await patchVoicemailIntent(id, key, token)
      } catch {
        setVoicemails(snapshot)
        setToast('Could not reclassify the voicemail. Reverted.')
      }
    },
    [voicemails, tenant.categories, token],
  )

  const counts = useMemo(() => tabCounts(voicemails), [voicemails])

  const sinceSync =
    syncAt !== null && now > 0 ? Math.max(0, Math.floor((now - syncAt) / 1000)) : null

  return (
    <div className={styles.root} data-theme={dark ? 'dark' : 'light'}>
      {/* Header chrome - sticky in production. */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-dashed border-rcp-rule bg-rcp-paper pb-4 pt-[22px]">
        <div className="flex items-center gap-3.5">
          {/* Fono wordmark: f - pulsing dot - no */}
          <div className="inline-flex items-baseline font-nunito text-[24px] font-extrabold leading-none tracking-[-0.02em] text-rcp-ink">
            <span>f</span>
            <span
              aria-hidden="true"
              className={cn(
                'mx-px inline-block h-2.5 w-2.5 rounded-full bg-rcp-terra-warm',
                styles.brandDot,
              )}
            />
            <span>no</span>
          </div>
          <span aria-hidden="true" className="h-[22px] w-px bg-rcp-rule" />
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="text-[14px] font-bold tracking-[-0.005em] text-rcp-ink">
              {tenant.name}
            </span>
            <span className="font-rcp-mono text-[10px] uppercase tracking-[0.04em] text-rcp-brown">
              {tenant.location}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <span className="inline-flex items-center gap-[7px] font-rcp-mono text-[11px] uppercase tracking-[0.04em] text-rcp-brown">
            <span
              aria-hidden="true"
              className={cn('h-1.5 w-1.5 rounded-full bg-rcp-success', styles.syncDot)}
            />
            {sinceSync === null ? 'live' : `live · last sync ${sinceSync}s`}
          </span>
          <span className="font-rcp-mono text-[13px] tabular-nums text-rcp-ink">
            {now > 0 ? formatClockWithSeconds(now) : ''}
          </span>
          <button
            type="button"
            onClick={() => setDark((d) => !d)}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={cn(
              styles.tap48,
              'inline-flex h-9 w-9 items-center justify-center rounded-md text-rcp-brown hover:bg-rcp-stamp-hover hover:text-rcp-ink',
            )}
          >
            {dark ? <IconSun w={18} h={18} /> : <IconMoon w={18} h={18} />}
          </button>
        </div>
      </header>

      <VoicemailTabs tab={tab} setTab={setTab} counts={counts} />

      {loading ? (
        <p className="py-[60px] text-center font-rcp-mono text-[11px] uppercase tracking-[0.14em] text-rcp-brown">
          Loading voicemails&hellip;
        </p>
      ) : (
        <VoicemailList
          tab={tab}
          voicemails={voicemails}
          categories={tenant.categories}
          onStatusChange={onStatusChange}
          onReclassify={onReclassify}
        />
      )}

      {/* Footer stamp */}
      <footer className="mt-10 flex items-center gap-2.5 pt-3.5 font-rcp-mono text-[10px] uppercase tracking-[0.14em] text-rcp-bone">
        <span>fono &middot; voicemail route &middot; kiosk v0.1</span>
        <span aria-hidden="true" className="h-0 flex-1 border-t border-dashed border-rcp-rule" />
        <span>{tenant.name.toUpperCase()}</span>
      </footer>

      {toast ? <Toast message={toast} onDismiss={dismissToast} /> : null}
    </div>
  )
}
