'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { KioskHeader } from './components/kiosk-header'
import { CallTabs, type KioskTab } from './components/call-tabs'
import { CallCard, type KioskCall } from './components/call-card'
import { deduplicateByCaller, sortMissedCalls } from './components/call-sort'
import { StatsBar } from './components/stats-bar'
import { config } from '@/lib/config'
import { useFonoToken } from '@/hooks/use-fono-token'
import { useImpersonation } from '@/lib/impersonation'
import { useRestaurant } from '@/lib/restaurant-context'
import { fetchTenantVoicemailConfig } from '@/lib/api'
import { KioskPage as VoicemailKioskPage } from '@/components/kiosk/voicemail/KioskPage'
import { CoexistKiosk } from '@/components/kiosk/voicemail/coexist/CoexistKiosk'
import type { Tenant } from '@/components/kiosk/voicemail/types'

// ── Page ──────────────────────────────────────────────────────────────────────
// Sorting + dedup helpers live in ./components/call-sort (shared with the
// coexistence kiosk's live surface).

function KioskContent() {
  const { data: session } = useSession()
  const token = useFonoToken()
  const imp = useImpersonation()
  // useRestaurant resolves through the impersonation hash branch when
  // the kiosk is loaded inside the admin View-as iframe, so this is the
  // single source of truth for both flavors.
  const { current } = useRestaurant()
  const activeTimezone = current.timezone
  const searchParams = useSearchParams()
  const urlTenantId = searchParams.get('tenant')
  const userTenants = (session?.tenants || []) as Array<{ id: string; name: string }>
  // Under impersonation, the impersonation JWT scopes us to imp.tenantId
  // which is NOT present in session.tenants (session is the admin's). Resolve
  // tenant info from the impersonation context to match what the backend will
  // accept on per-tenant fetches. Matches the pattern RestaurantProvider uses
  // for the same reason (see lib/restaurant-context.tsx).
  const tenantId = imp.readOnly
    ? imp.tenantId
    : (urlTenantId && userTenants.some(t => t.id === urlTenantId)
        ? urlTenantId
        : userTenants[0]?.id)
  const tenantName = imp.readOnly
    ? (imp.tenantName ?? '')
    : (userTenants.find(t => t.id === tenantId)?.name || '')
  const [dark, setDark] = useState(true)
  const [activeTab, setActiveTab] = useState<KioskTab>('missed')

  // Calls state — one array per tab
  const [missedCalls, setMissedCalls] = useState<KioskCall[]>([])
  const [recoveredCalls, setRecoveredCalls] = useState<KioskCall[]>([])
  const [ignoredCalls, setIgnoredCalls] = useState<KioskCall[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [confirmCall, setConfirmCall] = useState<KioskCall | null>(null)
  const [callbackLoading, setCallbackLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [animatingOut, setAnimatingOut] = useState<string | null>(null)
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Fetch calls for a given tab
  const fetchTab = useCallback(async (tab: string): Promise<KioskCall[]> => {
    if (!tenantId || !token) return []
    try {
      const res = await fetch(
        `${config.apiUrl}/api/v1/tenants/${tenantId}/kiosk/calls?tab=${tab}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) return []
      return await res.json()
    } catch {
      return []
    }
  }, [tenantId, token])

  // Fetch all tabs
  const fetchAllTabs = useCallback(async () => {
    if (!tenantId || !token) return
    setLoading(true)
    const [missed, recovered, ignored] = await Promise.all([
      fetchTab('missed'),
      fetchTab('recovered'),
      fetchTab('ignored'),
    ])
    setMissedCalls(missed)
    setRecoveredCalls(recovered)
    setIgnoredCalls(ignored)
    setLoading(false)
  }, [tenantId, token, fetchTab])

  // Initial fetch + poll every 30 seconds
  useEffect(() => {
    fetchAllTabs()
  }, [fetchAllTabs])

  useEffect(() => {
    const interval = setInterval(fetchAllTabs, 30000)
    return () => clearInterval(interval)
  }, [fetchAllTabs])

  // Request wake lock to keep screen on
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
        }
      } catch {
        // Wake lock not supported or denied
      }
    }
    requestWakeLock()
    function handleVisibility() {
      if (document.visibilityState === 'visible') requestWakeLock()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      wakeLock?.release()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  // Re-sort missed calls every 10 seconds so priority order updates as SLA timers tick
  const [sortTick, setSortTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSortTick((t) => t + 1), 10000)
    return () => clearInterval(id)
  }, [])

  const dedupedMissed = useMemo(() => deduplicateByCaller(missedCalls), [missedCalls])
  const dedupedRecovered = useMemo(() => deduplicateByCaller(recoveredCalls), [recoveredCalls])
  const dedupedIgnored = useMemo(() => deduplicateByCaller(ignoredCalls), [ignoredCalls])

  const sortedMissed = useMemo(
    () => sortMissedCalls(dedupedMissed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dedupedMissed, sortTick],
  )

  // Counts
  const breachedCount = dedupedMissed.filter(
    (c) => c.sla_breached || (c.sla_deadline && new Date(c.sla_deadline).getTime() < Date.now())
  ).length
  const totalCalls = dedupedMissed.length + dedupedRecovered.length + dedupedIgnored.length

  // Toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type })
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    toastTimeout.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // Card selection handler
  const handleSelectCard = useCallback((id: string) => {
    setSelectedCardId((prev) => (prev === id ? null : id))
  }, [])

  // Callback handler — opens modal
  const handleCallBack = useCallback((call: KioskCall) => {
    setConfirmCall(call)
  }, [])

  const handleConfirmCallback = useCallback(async () => {
    if (imp.readOnly) return
    if (!confirmCall || !token) return
    setCallbackLoading(true)
    const callToAct = confirmCall
    setConfirmCall(null)
    setSelectedCardId(null)

    try {
      const res = await fetch(
        `${config.apiUrl}/api/v1/calls/${callToAct.id}/callback?action=call`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(data.detail || 'Callback failed', 'error')
        setCallbackLoading(false)
        return
      }
    } catch {
      showToast('Callback failed', 'error')
      setCallbackLoading(false)
      return
    }

    // Optimistically set callback_status to 'calling' — polling picks up final status
    setMissedCalls((prev) =>
      prev.map((c) =>
        c.caller_phone === callToAct.caller_phone
          ? { ...c, callback_status: 'calling' as const }
          : c
      )
    )
    showToast(`Calling ${callToAct.caller_phone}...`, 'success')
    setCallbackLoading(false)
  }, [confirmCall, session, showToast])

  const handleIgnore = useCallback(async (call: KioskCall) => {
    if (imp.readOnly) return
    if (!token) return

    try {
      const res = await fetch(
        `${config.apiUrl}/api/v1/calls/${call.id}/callback?action=ignore`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (!res.ok) {
        showToast('Failed to ignore call', 'error')
        return
      }
    } catch {
      showToast('Failed to ignore call', 'error')
      return
    }

    // Animate out and move to ignored
    setAnimatingOut(call.id)
    setSelectedCardId(null)
    setTimeout(() => {
      setMissedCalls((prev) => prev.filter((c) => c.caller_phone !== call.caller_phone))
      setIgnoredCalls((prev) => [
        { ...call, callback_status: 'ignored' as const, callback_at: new Date().toISOString() },
        ...prev,
      ])
      setAnimatingOut(null)
      showToast(`Ignored ${call.caller_phone}`, 'success')
    }, 500)
  }, [session, showToast])

  // Which calls to show. The Voicemails tab is never shown on this surface
  // (Live + voicemail tenants route to the coexistence kiosk instead), so the
  // active tab is always one of the three call variants here.
  const callVariant: 'missed' | 'recovered' | 'ignored' =
    activeTab === 'recovered' ? 'recovered' : activeTab === 'ignored' ? 'ignored' : 'missed'
  const visibleCalls = callVariant === 'missed' ? sortedMissed
    : callVariant === 'recovered' ? dedupedRecovered
    : dedupedIgnored

  const bg = dark ? '#0a0a0a' : '#F5EDE6'

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: bg,
        fontFamily: 'var(--font-jakarta), system-ui, sans-serif',
        transition: 'background-color 0.3s',
        overflow: 'hidden',
      }}
    >
      <KioskHeader
        connected={true}
        dark={dark}
        onToggleTheme={() => setDark((d) => !d)}
        restaurantName={tenantName}
      />

      <CallTabs
        active={activeTab}
        onTabChange={setActiveTab}
        missedCount={dedupedMissed.length}
        recoveredCount={dedupedRecovered.length}
        ignoredCount={dedupedIgnored.length}
        breachedCount={breachedCount}
        dark={dark}
      />

      {/* Card grid */}
      <div
        className="scrollbar-none"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
        }}
      >
        {loading ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: `3px solid ${dark ? 'rgba(253,240,232,0.15)' : 'rgba(0,0,0,0.1)'}`,
                borderTopColor: '#E8731A',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <span style={{ fontSize: 14, color: dark ? 'rgba(253,240,232,0.3)' : '#8B7355', fontWeight: 500 }}>
              Loading calls...
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : visibleCalls.length === 0 ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke={dark ? 'rgba(253,240,232,0.15)' : 'rgba(0,0,0,0.1)'}
              strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
            </svg>
            <span style={{ fontSize: 16, color: dark ? 'rgba(253,240,232,0.3)' : '#8B7355', fontWeight: 500 }}>
              {activeTab === 'missed' ? 'No missed calls' : activeTab === 'recovered' ? 'No recovered calls yet' : 'No ignored calls'}
            </span>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {visibleCalls.map((call) => (
              <CallCard
                key={call.id}
                call={call}
                dark={dark}
                variant={callVariant}
                selected={selectedCardId === call.id}
                onSelect={activeTab === 'missed' ? handleSelectCard : undefined}
                onCallBack={activeTab === 'missed' && !imp.readOnly ? handleCallBack : undefined}
                onIgnore={activeTab === 'missed' && !imp.readOnly ? handleIgnore : undefined}
                animateOut={animatingOut === call.id}
                tenantTimezone={activeTimezone}
              />
            ))}
          </div>
        )}
      </div>

      <StatsBar
        totalCalls={totalCalls}
        missedCount={missedCalls.length}
        recoveredCount={recoveredCalls.length}
        breachedCount={breachedCount}
        dark={dark}
      />

      {/* Custom Callback Modal */}
      {confirmCall && (
        <div
          onClick={() => { setConfirmCall(null) }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '90%',
              maxWidth: 380,
              backgroundColor: dark ? '#1a1d24' : '#FFFFFF',
              borderRadius: 20,
              padding: '32px 28px 24px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
              animation: 'kiosk-modal-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            {/* Green phone icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: 'rgba(34,197,94,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
            </div>

            {/* Phone number */}
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: dark ? '#FDF0E8' : '#1E0E00',
                textAlign: 'center',
              }}
            >
              {confirmCall.caller_phone}
            </div>

            {/* Repeat caller indicator */}
            {confirmCall.repeat_count > 1 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#EF4444' }}>
                {confirmCall.repeat_count}× repeat caller
              </span>
            )}

            {/* Description */}
            <p
              style={{
                fontSize: 14,
                color: dark ? 'rgba(253,240,232,0.5)' : '#8B7355',
                textAlign: 'center',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Customer rings first. Once they answer, your phone connects.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 12, width: '100%', marginTop: 8 }}>
              <button
                onClick={() => setConfirmCall(null)}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: `1.5px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                  background: 'none',
                  color: dark ? '#FDF0E8' : '#1E0E00',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCallback}
                disabled={callbackLoading || imp.readOnly}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: 'none',
                  backgroundColor: '#16A34A',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: (callbackLoading || imp.readOnly) ? 'not-allowed' : 'pointer',
                  opacity: (callbackLoading || imp.readOnly) ? 0.7 : 1,
                }}
              >
                {callbackLoading ? 'Calling...' : 'Call Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '12px 24px',
            borderRadius: 12,
            backgroundColor: toast.type === 'success' ? '#22C55E' : '#EF4444',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 100,
            whiteSpace: 'nowrap',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

// ── Route branch ──────────────────────────────────────────────────────────────
// Resolves the tenant's routing_mode and dispatches: voicemail-route tenants
// get the new Direction A kiosk, SLA-route tenants get the existing UI
// (KioskContent) unchanged. Tenant id/name are resolved the same way
// KioskContent and restaurant-context resolve them - the impersonation
// context wins, otherwise the session - and the resolved Tenant is passed
// down as a prop (brief section 7 / CHIRAN principle #49).

function KioskRouteLoading() {
  return (
    <div className="flex h-[100dvh] items-center justify-center bg-cream">
      <span className="text-[13px] font-medium text-brown">Loading kiosk...</span>
    </div>
  )
}

function KioskRouter() {
  const { data: session, status } = useSession()
  const token = useFonoToken()
  const imp = useImpersonation()
  const searchParams = useSearchParams()
  const urlTenantId = searchParams.get('tenant')
  const userTenants = (session?.tenants || []) as Array<{ id: string; name: string }>
  const tenantId = imp.readOnly
    ? imp.tenantId
    : urlTenantId && userTenants.some((t) => t.id === urlTenantId)
      ? urlTenantId
      : userTenants[0]?.id
  const tenantName = imp.readOnly
    ? imp.tenantName ?? ''
    : userTenants.find((t) => t.id === tenantId)?.name || ''

  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [resolving, setResolving] = useState(true)

  useEffect(() => {
    if (!tenantId) return
    let cancelled = false
    setResolving(true)
    fetchTenantVoicemailConfig(tenantId, tenantName, token).then((cfg) => {
      if (cancelled) return
      setTenant(cfg)
      setResolving(false)
    })
    return () => {
      cancelled = true
    }
  }, [tenantId, tenantName, token])

  // Session still settling.
  if (status === 'loading') return <KioskRouteLoading />
  // No tenant resolvable: fall back to the existing SLA kiosk, which
  // degrades gracefully to empty states.
  if (!tenantId) return <KioskContent />
  // Resolving the tenant config.
  if (resolving) return <KioskRouteLoading />
  // Config unresolved (backend failure): degrade to the SLA kiosk rather than
  // masking the failure with a mock voicemail tenant (arch fact #362).
  if (!tenant) return <KioskContent />
  // Branch at the page level so neither side carries the other's cost.
  // Live + voicemail tenant (e.g. Thecha): the coexistence kiosk — the SLA
  // live surface with the nested Layout C voicemail treatment under the
  // Voicemails tab. Gated on call_setup_path + voicemail_enabled, NOT
  // routing_mode (which derives 'sla' for live tenants and so never matched
  // the prototype's gate) — see arch fact #362.
  if (tenant.call_setup_path === 'live' && tenant.voicemail_enabled) {
    return <CoexistKiosk tenant={tenant} />
  }
  // Pure voicemail tenant: the standalone Layout C kiosk, unchanged.
  if (tenant.routing_mode === 'voicemail') {
    return <VoicemailKioskPage tenant={tenant} />
  }
  // SLA-only tenant.
  return <KioskContent />
}

export default function KioskPage() {
  return (
    <Suspense>
      <KioskRouter />
    </Suspense>
  )
}
