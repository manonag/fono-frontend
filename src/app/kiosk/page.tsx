'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { KioskHeader } from './components/kiosk-header'
import { CallTabs, type KioskTab } from './components/call-tabs'
import { CallCard, type KioskCall } from './components/call-card'
import { StatsBar } from './components/stats-bar'
import { config } from '@/lib/config'

// ── Mock Data ─────────────────────────────────────────────────────────────────

function makeMockData() {
  const now = Date.now()

  const missed: KioskCall[] = [
    // Breached #1
    {
      id: '1',
      caller_phone: '+1 (510) 555-5678',
      call_status: 'NO_ANSWER',
      started_at: new Date(now - 22 * 60000).toISOString(),
      duration_seconds: null,
      callback_status: 'pending',
      callback_at: null,
      repeat_count: 3,
      sla_deadline: new Date(now - 7 * 60000).toISOString(),
      sla_breached: true,
    },
    // Breached #2
    {
      id: '2',
      caller_phone: '+1 (925) 555-1122',
      call_status: 'NO_ANSWER',
      started_at: new Date(now - 18 * 60000).toISOString(),
      duration_seconds: null,
      callback_status: 'pending',
      callback_at: null,
      repeat_count: 1,
      sla_deadline: new Date(now - 3 * 60000).toISOString(),
      sla_breached: true,
    },
    // Approaching (<5min left)
    {
      id: '3',
      caller_phone: '+1 (408) 555-1234',
      call_status: 'NO_ANSWER',
      started_at: new Date(now - 12 * 60000).toISOString(),
      duration_seconds: null,
      callback_status: 'pending',
      callback_at: null,
      repeat_count: 2,
      sla_deadline: new Date(now + 3 * 60000).toISOString(),
      sla_breached: false,
    },
    // Safe #1
    {
      id: '4',
      caller_phone: '+1 (650) 555-9012',
      call_status: 'NO_ANSWER',
      started_at: new Date(now - 7 * 60000).toISOString(),
      duration_seconds: null,
      callback_status: 'pending',
      callback_at: null,
      repeat_count: 1,
      sla_deadline: new Date(now + 8 * 60000).toISOString(),
      sla_breached: false,
    },
    // Safe #2
    {
      id: '5',
      caller_phone: '+1 (925) 555-7890',
      call_status: 'NO_ANSWER',
      started_at: new Date(now - 4 * 60000).toISOString(),
      duration_seconds: null,
      callback_status: 'pending',
      callback_at: null,
      repeat_count: 1,
      sla_deadline: new Date(now + 11 * 60000).toISOString(),
      sla_breached: false,
    },
    // Safe #3
    {
      id: '6',
      caller_phone: '+1 (408) 555-3456',
      call_status: 'NO_ANSWER',
      started_at: new Date(now - 2 * 60000).toISOString(),
      duration_seconds: null,
      callback_status: 'pending',
      callback_at: null,
      repeat_count: 1,
      sla_deadline: new Date(now + 13 * 60000).toISOString(),
      sla_breached: false,
    },
  ]

  const recovered: KioskCall[] = [
    {
      id: '7',
      caller_phone: '+1 (408) 555-0000',
      call_status: 'NO_ANSWER',
      started_at: new Date(now - 45 * 60000).toISOString(),
      duration_seconds: 180,
      callback_status: 'recovered',
      callback_at: new Date(now - 35 * 60000).toISOString(),
      repeat_count: 1,
      sla_deadline: null,
      sla_breached: false,
    },
    {
      id: '8',
      caller_phone: '+1 (510) 555-4444',
      call_status: 'NO_ANSWER',
      started_at: new Date(now - 90 * 60000).toISOString(),
      duration_seconds: 120,
      callback_status: 'recovered',
      callback_at: new Date(now - 80 * 60000).toISOString(),
      repeat_count: 2,
      sla_deadline: null,
      sla_breached: false,
    },
  ]

  const ignored: KioskCall[] = [
    {
      id: '9',
      caller_phone: '+1 (510) 555-9999',
      call_status: 'NO_ANSWER',
      started_at: new Date(now - 60 * 60000).toISOString(),
      duration_seconds: null,
      callback_status: 'ignored',
      callback_at: new Date(now - 50 * 60000).toISOString(),
      repeat_count: 1,
      sla_deadline: null,
      sla_breached: false,
    },
  ]

  return { missed, recovered, ignored }
}

// ── Sorting ───────────────────────────────────────────────────────────────────

function getSLARemaining(call: KioskCall): number {
  if (!call.sla_deadline) return Infinity
  return new Date(call.sla_deadline).getTime() - Date.now()
}

function sortMissedCalls(calls: KioskCall[]): KioskCall[] {
  return [...calls].sort((a, b) => {
    const aNowBreached = a.sla_breached || (a.sla_deadline ? new Date(a.sla_deadline).getTime() < Date.now() : false)
    const bNowBreached = b.sla_breached || (b.sla_deadline ? new Date(b.sla_deadline).getTime() < Date.now() : false)

    // Breached always on top
    if (aNowBreached && !bNowBreached) return -1
    if (!aNowBreached && bNowBreached) return 1

    // Among breached: most overdue first
    if (aNowBreached && bNowBreached) {
      return new Date(a.sla_deadline!).getTime() - new Date(b.sla_deadline!).getTime()
    }

    // Among non-breached: least SLA remaining first with repeat caller boost
    const aRemaining = getSLARemaining(a) / (a.repeat_count > 1 ? a.repeat_count * 0.5 : 1)
    const bRemaining = getSLARemaining(b) / (b.repeat_count > 1 ? b.repeat_count * 0.5 : 1)

    if (aRemaining !== bRemaining) return aRemaining - bRemaining

    // Tiebreaker: most recent first
    return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function KioskPage() {
  const { data: session } = useSession()
  const [dark, setDark] = useState(true)
  const [activeTab, setActiveTab] = useState<KioskTab>('missed')
  const [mockData] = useState(makeMockData)
  const [missedCalls, setMissedCalls] = useState<KioskCall[]>(mockData.missed)
  const [recoveredCalls, setRecoveredCalls] = useState<KioskCall[]>(mockData.recovered)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [ignoredCalls, setIgnoredCalls] = useState<KioskCall[]>(mockData.ignored)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [confirmCall, setConfirmCall] = useState<KioskCall | null>(null)
  const [callbackLoading, setCallbackLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [animatingOut, setAnimatingOut] = useState<string | null>(null)
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

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

  const sortedMissed = useMemo(
    () => sortMissedCalls(missedCalls),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [missedCalls, sortTick],
  )

  // Counts
  const breachedCount = missedCalls.filter(
    (c) => c.sla_breached || (c.sla_deadline && new Date(c.sla_deadline).getTime() < Date.now())
  ).length
  const totalCalls = missedCalls.length + recoveredCalls.length + ignoredCalls.length

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
    if (!confirmCall) return
    setCallbackLoading(true)
    const callToMove = confirmCall
    setConfirmCall(null)
    setSelectedCardId(null)

    try {
      const token = session?.fonoToken
      await fetch(`${config.apiUrl}/api/v1/calls/${callToMove.id}/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
    } catch {
      // Backend callback endpoint may not exist yet — continue with mock flow
    }

    // Animate out the card, then move to recovered
    setAnimatingOut(callToMove.id)
    setTimeout(() => {
      setMissedCalls((prev) => prev.filter((c) => c.id !== callToMove.id))
      setRecoveredCalls((prev) => [
        { ...callToMove, callback_status: 'recovered' as const, callback_at: new Date().toISOString() },
        ...prev,
      ])
      setAnimatingOut(null)
      showToast(`Calling back ${callToMove.caller_phone}...`, 'success')
    }, 500)

    setCallbackLoading(false)
  }, [confirmCall, session, showToast])

  // Which calls to show
  const visibleCalls = activeTab === 'missed' ? sortedMissed
    : activeTab === 'recovered' ? recoveredCalls
    : ignoredCalls

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
      />

      <CallTabs
        active={activeTab}
        onTabChange={setActiveTab}
        missedCount={missedCalls.length}
        recoveredCount={recoveredCalls.length}
        ignoredCount={ignoredCalls.length}
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
        {visibleCalls.length === 0 ? (
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
                variant={activeTab}
                selected={selectedCardId === call.id}
                onSelect={activeTab === 'missed' ? handleSelectCard : undefined}
                onCallBack={activeTab === 'missed' ? handleCallBack : undefined}
                animateOut={animatingOut === call.id}
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
                disabled={callbackLoading}
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 12,
                  border: 'none',
                  backgroundColor: '#16A34A',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: callbackLoading ? 'not-allowed' : 'pointer',
                  opacity: callbackLoading ? 0.7 : 1,
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
