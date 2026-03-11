'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { Badge } from '@/components/badge'
import { AudioPlayer } from '@/components/audio-player'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useCallEvents } from '@/hooks/use-call-events'
import { fetchCallLog, fetchDashboardSummary, fetchCombinedCallLog, fetchCombinedSummary } from '@/lib/api'
import { useRestaurant } from '@/lib/restaurant-context'
import { formatPhoneNumber, formatDuration } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { CallRecord } from '@/types'

type StatusFilter = 'all' | 'completed' | 'missed' | 'recovered'
const STATUS_PILLS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'completed', label: 'Completed' },
  { id: 'missed', label: 'Missed' },
  { id: 'recovered', label: 'Recovered' },
]

function safeNum(n: unknown): number {
  const num = Number(n)
  return isNaN(num) ? 0 : num
}

export default function CallsPage() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [summary, setSummary] = useState<{ missed_calls: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null)

  const { tenantId, isAll, allTenantIds, current } = useRestaurant()

  const loadCalls = useCallback(async (reset = false) => {
    const p = reset ? 1 : page
    if (reset) setLoading(true)
    else setLoadingMore(true)

    try {
      const filters = { status: statusFilter === 'all' ? 'all' as const : statusFilter, page: p, perPage: 20, caller: search.trim() || undefined }
      const [result, summaryData] = await Promise.all([
        isAll ? fetchCombinedCallLog(allTenantIds, filters) : fetchCallLog(tenantId, filters),
        reset ? (isAll ? fetchCombinedSummary(allTenantIds) : fetchDashboardSummary(tenantId)) : Promise.resolve(summary),
      ])
      if (reset) {
        setCalls(result.calls)
        setSummary(summaryData)
        setPage(2)
      } else {
        setCalls(prev => [...prev, ...result.calls])
        setPage(p + 1)
      }
      setHasMore(result.calls.length === 20)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tenantId, statusFilter, page, summary, search])

  useEffect(() => { loadCalls(true) }, [tenantId, statusFilter, search]) // eslint-disable-line react-hooks/exhaustive-deps

  const { connected } = useCallEvents({ onEvent: () => loadCalls(true) })

  const missedCalls = safeNum(summary?.missed_calls)

  // Server-side filtering is done via API params — calls are already filtered
  const filteredCalls = calls

  // Count callers for "history"
  const callerHistory = useMemo(() => {
    const counts = new Map<string, number>()
    calls.forEach(c => counts.set(c.caller_number, (counts.get(c.caller_number) || 0) + 1))
    return counts
  }, [calls])

  // Detail panel (desktop slide-in, mobile full page)
  if (isMobile && selectedCall) {
    return (
      <div className="min-h-screen bg-cream flex flex-col" style={{ paddingBottom: 64 }}>
        <div
          className="bg-white px-4 flex items-center gap-3 sticky top-0 z-30"
          style={{ height: 52, borderBottom: '1px solid rgba(0,0,0,0.06)' }}
        >
          <button onClick={() => setSelectedCall(null)} className="flex items-center justify-center" style={{ width: 36, height: 36 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1E0E00" strokeWidth="2">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#1E0E00' }}>Call Details</span>
        </div>
        <main className="flex-1 p-4">
          <CallDetailContent call={selectedCall} callerCount={callerHistory.get(selectedCall.caller_number) || 1} />
        </main>
        <MobileNav missedCount={missedCalls} />
      </div>
    )
  }

  const callList = (
    <div style={{ maxWidth: isMobile ? undefined : 640, flex: 1 }}>
      {/* Search bar */}
      <div className="relative" style={{ marginBottom: 16 }}>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B0A090" strokeWidth="1.8"
          className="absolute" style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Search by phone number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white transition-colors focus:outline-none"
          style={{
            padding: '14px 16px 14px 44px',
            borderRadius: 14,
            border: '1.5px solid rgba(0,0,0,0.08)',
            fontSize: 14,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
        />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto" style={{ marginBottom: 16, paddingBottom: 2 }}>
        {STATUS_PILLS.map(pill => (
          <button
            key={pill.id}
            onClick={() => setStatusFilter(pill.id)}
            className="transition-all flex-shrink-0"
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: statusFilter === pill.id ? '#E0602A' : '#fff',
              color: statusFilter === pill.id ? '#fff' : '#5C3D22',
              border: statusFilter === pill.id ? 'none' : '1px solid rgba(0,0,0,0.06)',
              cursor: 'pointer',
            }}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Call list */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white flex items-center gap-3" style={{ borderRadius: 14, padding: 16 }}>
              <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
              <div className="flex-1 space-y-2">
                <div className="skeleton" style={{ height: 14, width: '60%' }} />
                <div className="skeleton" style={{ height: 11, width: '30%' }} />
              </div>
              <div className="skeleton" style={{ height: 22, width: 70, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="bg-white flex flex-col items-center justify-center" style={{ borderRadius: 20, padding: '48px 20px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B0A090" strokeWidth="1.5" style={{ opacity: 0.5 }}>
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p style={{ fontSize: 14, color: '#8B7355', marginTop: 12 }}>No calls found</p>
          <p style={{ fontSize: 12, color: '#B0A090', marginTop: 4 }}>Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCalls.map(call => (
            <CallRow
              key={call.id}
              call={call}
              active={selectedCall?.id === call.id}
              onClick={() => setSelectedCall(call)}
            />
          ))}
          {hasMore && (
            <button
              onClick={() => loadCalls(false)}
              disabled={loadingMore}
              className="w-full bg-white transition-all hover:bg-cream"
              style={{
                borderRadius: 14,
                padding: '14px 0',
                fontSize: 14,
                fontWeight: 600,
                color: '#E0602A',
                border: '1px solid rgba(0,0,0,0.06)',
                cursor: 'pointer',
              }}
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col" style={{ paddingBottom: 64 }}>
        <Header variant="dashboard" restaurantName={isAll ? 'All Restaurants' : current.name} connected={connected} isMobile />
        <main className="flex-1 px-4 pt-5 pb-4">
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: '#1E0E00', marginBottom: 16 }}>
            All Calls
          </h1>
          {callList}
        </main>
        <MobileNav missedCount={missedCalls} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="dashboard" restaurantName={isAll ? 'All Restaurants' : current.name} connected={connected} />
      <div className="flex flex-1">
        <Sidebar missedCount={missedCalls} />
        <main className="flex-1 overflow-y-auto flex" style={{ padding: '36px 40px' }}>
          <div className="flex gap-6 w-full" style={{ maxWidth: 1100 }}>
            <div className="flex-1 min-w-0">
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#1E0E00', marginBottom: 20 }}>
                All Calls
              </h1>
              {callList}
            </div>

            {/* Detail panel — desktop slide-in */}
            {selectedCall && (
              <div
                className="bg-white flex-shrink-0"
                style={{
                  width: 380,
                  borderRadius: 20,
                  border: '1px solid rgba(0,0,0,0.04)',
                  padding: '24px 28px',
                  alignSelf: 'flex-start',
                  position: 'sticky',
                  top: 36,
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E0E00' }}>Call Details</h3>
                  <button onClick={() => setSelectedCall(null)} className="hover:opacity-60 transition-opacity">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2">
                      <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <CallDetailContent call={selectedCall} callerCount={callerHistory.get(selectedCall.caller_number) || 1} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Call Row
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CallRow({ call, active, onClick }: { call: CallRecord; active: boolean; onClick: () => void }) {
  const isMissed = call.status === 'missed' || call.status === 'no-answer'
  const statusColor = isMissed ? '#EF4444' : call.status === 'recovered' ? '#22C55E' : call.status === 'in_progress' ? '#F59E0B' : '#22C55E'
  const time = new Date(call.created_at)

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full bg-white flex items-center gap-3 text-left transition-all',
        active ? 'ring-2 ring-terra' : 'hover:shadow-sm'
      )}
      style={{
        borderRadius: 14,
        padding: '14px 16px',
        borderLeft: isMissed ? '4px solid #EF4444' : undefined,
      }}
    >
      {/* Status circle */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: `${statusColor}10` }}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: statusColor }} />
      </div>

      {/* Phone + meta */}
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: '#1E0E00' }}>
          {formatPhoneNumber(call.caller_number)}
        </p>
        <p style={{ fontSize: 12, color: '#8B7355' }}>
          {call.duration_seconds && call.duration_seconds > 0 ? formatDuration(call.duration_seconds) : 'No answer'}
          {' '}&middot; Inbound
        </p>
      </div>

      {/* Badge + time */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <Badge status={call.status} />
        <span style={{ fontSize: 11, color: '#B0A090' }}>
          {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      {/* Play indicator */}
      {call.recording_url && (
        <div
          className="flex items-center justify-center flex-shrink-0 bg-terra text-white rounded-full"
          style={{ width: 32, height: 32 }}
        >
          <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2 1.5v7l6.5-3.5L2 1.5z" />
          </svg>
        </div>
      )}
    </button>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Call Detail Content
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CallDetailContent({ call, callerCount }: { call: CallRecord; callerCount: number }) {
  const isMissed = call.status === 'missed' || call.status === 'no-answer'
  const time = new Date(call.created_at)

  return (
    <div>
      {/* Phone number */}
      <p style={{ fontSize: 22, fontWeight: 800, color: '#1E0E00', letterSpacing: '-0.02em', marginBottom: 8 }}>
        {formatPhoneNumber(call.caller_number)}
      </p>
      <div style={{ marginBottom: 24 }}>
        <Badge status={call.status} />
      </div>

      {/* Timeline */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B0A090', marginBottom: 12 }}>
          Call Timeline
        </h4>
        <div className="flex flex-col gap-0" style={{ paddingLeft: 8 }}>
          <TimelineItem label="Ring" time={time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })} active />
          {!isMissed && (
            <TimelineItem label="Answered" time="Connected" active />
          )}
          {call.duration_seconds && call.duration_seconds > 0 && (
            <TimelineItem label="Duration" time={formatDuration(call.duration_seconds)} active />
          )}
          <TimelineItem
            label={isMissed ? 'Missed' : 'Ended'}
            time={isMissed ? 'No answer' : 'Call completed'}
            active
            isLast
          />
        </div>
      </div>

      {/* Audio player */}
      {call.recording_url && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B0A090', marginBottom: 12 }}>
            Recording
          </h4>
          <AudioPlayer url={call.recording_url} />
        </div>
      )}

      {/* Metadata */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#B0A090', marginBottom: 12 }}>
          Details
        </h4>
        <div className="space-y-2">
          <MetaRow label="Date" value={time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} />
          <MetaRow label="Time" value={time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} />
          <MetaRow label="Direction" value="Inbound" />
          <MetaRow label="Duration" value={call.duration_seconds != null && call.duration_seconds > 0 ? formatDuration(call.duration_seconds) : '—'} />
          <MetaRow label="Status" value={call.status} />
        </div>
      </div>

      {/* Caller history */}
      {callerCount > 1 && (
        <div
          className="bg-cream"
          style={{ borderRadius: 12, padding: '12px 16px', marginBottom: 24 }}
        >
          <p style={{ fontSize: 13, color: '#5C3D22', fontWeight: 500 }}>
            This number has called {callerCount} times this week
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          className="flex-1 flex items-center justify-center gap-2 bg-terra text-white font-bold transition-colors hover:bg-terra-dark"
          style={{ height: 48, borderRadius: 14, fontSize: 14 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
          </svg>
          Call Back
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-2 bg-white font-bold transition-colors hover:bg-cream"
          style={{ height: 48, borderRadius: 14, fontSize: 14, color: '#5C3D22', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          Mark Resolved
        </button>
      </div>
    </div>
  )
}

function TimelineItem({ label, time, active, isLast }: { label: string; time: string; active: boolean; isLast?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          backgroundColor: active ? '#E0602A' : '#D4D0CC',
          marginTop: 4,
        }} />
        {!isLast && <div style={{ width: 2, height: 28, backgroundColor: 'rgba(0,0,0,0.06)' }} />}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 12 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1E0E00' }}>{label}</p>
        <p style={{ fontSize: 12, color: '#8B7355' }}>{time}</p>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <span style={{ fontSize: 13, color: '#8B7355' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#1E0E00' }}>{value}</span>
    </div>
  )
}
