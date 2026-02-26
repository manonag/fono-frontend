'use client'

/*
 * ──────────────────────────────────────────────────
 * WIREFRAME — Mobile (375px)
 * ──────────────────────────────────────────────────
 * ┌─────────────────────────────────┐
 * │ Spice Garden          ● Live    │  48px, white bg, bottom border
 * │ Powered by fono                 │
 * ├─────────────────────────────────┤
 * │                                 │
 * │      3 missed calls   🔴       │  Hero stat, 40px, red
 * │  30 total · 27 answered · 0 rec│  13px, brown
 * │                                 │
 * ├─────────────────────────────────┤
 * │ Today's calls                   │
 * │ ▁▂▃▅▇▅▃▂▁▂▄▅▃▂▁               │  Sparkline 48px
 * │ 6AM       12PM          10PM   │
 * ├─────────────────────────────────┤
 * │ Recent Calls          See all →│
 * │─────────────────────────────────│
 * │🔴 +1 (209) 666-0447           │  56px rows, red border = missed
 * │   Missed · 12 min ago          │
 * │─────────────────────────────────│
 * │   +1 (469) 348-4979      ▶    │
 * │   Completed · 2m 34s · 1h ago  │
 * ├─────────────────────────────────┤
 * │ 📊 Home  📞 Calls ⚙ Set  🔔3 │  56px, white, sticky bottom
 * └─────────────────────────────────┘
 *
 * ──────────────────────────────────────────────────
 * WIREFRAME — Desktop (1280px)
 * ──────────────────────────────────────────────────
 * ┌─ terra-dark header ─────────────────────────────┐
 * │ fono○ | Spice Garden    Feb 26, 2026 ● Live ⚙  │
 * ├─────────────────────────────────────────────────┤
 * │ [Today] [Yesterday] [This Week] [This Month]   │
 * │                                                  │
 * │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
 * │ │TOTAL │ │MISSED│ │RECOV │ │AVG   │  4 cards   │
 * │ │  30  │ │  3   │ │  2   │ │ 4m   │  w800 32px │
 * │ └──────┘ └──────┘ └──────┘ └──────┘            │
 * │                                                  │
 * │ Call Volume                                      │
 * │ ████ ████ ████ (200px max)                      │
 * │                                                  │
 * │ Call Log                                         │
 * │ [All 30] [Missed] [Answered] [Recovered]        │
 * │ 📞 +1 (209).. · 2h ago  [Completed] 2m34s  ▶  │
 * │ 📞 +1 (469).. · 3h ago  [Missed]           ▶  │
 * └─────────────────────────────────────────────────┘
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { DateFilterBar } from '@/components/date-filter'
import { Tabs } from '@/components/tabs'
import { Badge } from '@/components/badge'
import { AudioPlayer } from '@/components/audio-player'
import { BarChart, HorizontalBarChart } from '@/components/bar-chart'
import { Button } from '@/components/button'
import { useCallEvents } from '@/hooks/use-call-events'
import { useIsMobile } from '@/hooks/use-mobile'
import { fetchDashboardSummary, fetchCallLog, fetchChartData } from '@/lib/api'
import { config } from '@/lib/config'
import { cn, formatPhoneNumber, formatDuration, timeAgo } from '@/lib/utils'
import type { DashboardSummary, CallRecord, ChartDataPoint, DateFilter, CallLogFilters } from '@/types'

type CallStatusFilter = 'all' | 'completed' | 'missed' | 'recovered'

function safeNum(val: number | undefined | null): number {
  if (val === undefined || val === null || isNaN(val)) return 0
  return val
}

export default function DashboardPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [statusFilter, setStatusFilter] = useState<CallStatusFilter>('all')
  const [page, setPage] = useState(1)
  const perPage = 20
  const isMobile = useIsMobile()

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [totalCalls, setTotalCalls] = useState(0)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [showCallLog, setShowCallLog] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null)

  // Pull to refresh
  const [refreshing, setRefreshing] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const pullStartY = useRef(0)
  const pulling = useRef(false)

  const tenantId = config.tenantId

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryData, callData] = await Promise.all([
        fetchDashboardSummary(tenantId),
        fetchCallLog(tenantId, {
          status: statusFilter === 'all' ? 'all' : statusFilter,
          page,
          perPage,
        } as CallLogFilters),
      ])
      setSummary(summaryData)
      setCalls(callData.calls)
      setTotalCalls(callData.total)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [tenantId, statusFilter, page])

  const loadChart = useCallback(async () => {
    setChartLoading(true)
    try {
      const data = await fetchChartData(tenantId, dateFilter)
      setChartData(data)
    } catch (err) {
      console.error('Failed to load chart data:', err)
    } finally {
      setChartLoading(false)
    }
  }, [tenantId, dateFilter])

  const refreshAll = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadData(), loadChart()])
    setRefreshing(false)
  }, [loadData, loadChart])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadChart() }, [loadChart])
  useEffect(() => { setPage(1) }, [statusFilter])

  // Pull to refresh handlers
  useEffect(() => {
    if (!isMobile) return
    const el = mainRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        pullStartY.current = e.touches[0].clientY
        pulling.current = true
      }
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return
      const dy = e.touches[0].clientY - pullStartY.current
      if (dy > 80 && !refreshing) {
        pulling.current = false
        refreshAll()
      }
    }
    const onTouchEnd = () => { pulling.current = false }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [isMobile, refreshing, refreshAll])

  const { connected } = useCallEvents({
    onEvent: (event) => {
      setToast(`New call from ${formatPhoneNumber(event.call.caller_number)}`)
      setTimeout(() => setToast(null), 5000)
      loadData()
      loadChart()
    },
  })

  const missedCalls = safeNum(summary?.missed_calls)
  const totalCallsNum = safeNum(summary?.total_calls)
  const answeredCalls = safeNum(summary?.answered_calls)
  const recoveredCalls = safeNum(summary?.recovered_calls)
  const avgResponse = safeNum(summary?.avg_response_time)
  const recoveryRate = totalCallsNum > 0 ? Math.round((recoveredCalls / totalCallsNum) * 100) : 0
  const avgResponseMin = avgResponse > 0 ? `${Math.round(avgResponse / 60)}m` : '—'

  const statusTabs = [
    { id: 'all', label: 'All', count: totalCalls },
    { id: 'missed', label: 'Missed' },
    { id: 'completed', label: 'Answered' },
    { id: 'recovered', label: 'Recovered' },
  ]
  const totalPages = Math.ceil(totalCalls / perPage)
  const showFrom = totalCalls === 0 ? 0 : (page - 1) * perPage + 1
  const showTo = Math.min(page * perPage, totalCalls)
  const mobileCalls = calls.slice(0, 5)

  // Sparkline data
  const sparkHasData = chartData.some((d) => d.answered + d.missed + d.recovered > 0)
  const sparkMax = Math.max(...chartData.map((d) => d.answered + d.missed + d.recovered), 1)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MOBILE LAYOUT (< 768px)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isMobile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col pb-14">
        {/* Mobile Header — white bg, compact */}
        <header className="bg-white px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <p className="text-ink font-bold text-base leading-tight">Spice Garden</p>
            <p className="text-brown text-[10px] font-medium">Powered by fono</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2 h-2 rounded-full', connected ? 'bg-green-500' : 'bg-gray-300')} />
            <span className="text-brown text-[11px] font-medium">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-4 right-4 z-50 px-4 py-3 rounded-2xl text-sm font-medium text-center text-cream bg-ink" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            {toast}
          </div>
        )}

        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="flex justify-center py-2">
            <div className="w-5 h-5 border-2 border-terra border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <main ref={mainRef} className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
          {/* ── Hero Stat ── */}
          {loading ? (
            <div className="bg-white rounded-2xl p-6 animate-pulse" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="h-12 w-28 bg-gray-100 rounded-lg mx-auto" />
              <div className="h-4 w-52 bg-gray-100 rounded mx-auto mt-4" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              {missedCalls > 0 ? (
                <>
                  <p className="text-red-500 font-extrabold leading-none" style={{ fontSize: 40, letterSpacing: '-0.04em' }}>
                    {missedCalls} <span className="text-lg font-bold">missed call{missedCalls !== 1 ? 's' : ''}</span>
                  </p>
                </>
              ) : (
                <p className="text-green-500 font-bold leading-none" style={{ fontSize: 28, letterSpacing: '-0.02em' }}>
                  All caught up!
                </p>
              )}
              <p className="text-brown mt-3" style={{ fontSize: 13 }}>
                {totalCallsNum} total &middot; {answeredCalls} answered &middot; {recoveredCalls} recovered
              </p>
            </div>
          )}

          {/* ── Sparkline ── */}
          <div className="bg-white rounded-2xl p-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-ink font-bold" style={{ fontSize: 16 }}>Today&apos;s calls</span>
              {sparkHasData && (
                <button
                  onClick={() => setShowChart(true)}
                  className="text-terra font-medium h-8 px-2 flex items-center"
                  style={{ fontSize: 12 }}
                >
                  Details
                </button>
              )}
            </div>
            {chartLoading ? (
              <div className="h-12 rounded-lg bg-gray-50 animate-pulse" />
            ) : !sparkHasData ? (
              <div className="h-12 flex items-center justify-center">
                <p className="text-brown" style={{ fontSize: 14 }}>No calls yet today</p>
              </div>
            ) : (
              <>
                <div className="h-12 flex items-end gap-[2px]" onClick={() => setShowChart(true)}>
                  {chartData.map((d) => {
                    const total = d.answered + d.missed + d.recovered
                    const h = total > 0 ? Math.max((total / sparkMax) * 44, 3) : 0
                    const hasMissed = d.missed > 0
                    return (
                      <div
                        key={d.hour}
                        className="flex-1 rounded-t-sm transition-all duration-150"
                        style={{
                          height: `${h}px`,
                          backgroundColor: hasMissed ? '#EF4444' : total > 0 ? '#E0602A' : 'transparent',
                          opacity: total > 0 ? (hasMissed ? 1 : 0.35) : 0,
                        }}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1.5">
                  <span className="text-brown" style={{ fontSize: 10 }}>{chartData[0]?.label}</span>
                  <span className="text-brown" style={{ fontSize: 10 }}>{chartData[Math.floor(chartData.length / 2)]?.label}</span>
                  <span className="text-brown" style={{ fontSize: 10 }}>{chartData[chartData.length - 1]?.label}</span>
                </div>
              </>
            )}
          </div>

          {/* ── Recent Calls ── */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <span className="text-ink font-bold" style={{ fontSize: 16 }}>Recent Calls</span>
              {totalCalls > 5 && (
                <button
                  onClick={() => setShowCallLog(true)}
                  className="text-terra font-medium h-8 px-1 flex items-center"
                  style={{ fontSize: 12 }}
                >
                  See all
                </button>
              )}
            </div>

            {loading ? (
              <div className="px-4 pb-4 space-y-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3 py-3" style={{ minHeight: 56 }}>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/5" />
                      <div className="h-3 bg-gray-50 rounded w-2/5" />
                    </div>
                    <div className="h-5 bg-gray-100 rounded-full w-16" />
                  </div>
                ))}
              </div>
            ) : mobileCalls.length === 0 ? (
              <div className="px-4 pb-6 pt-4 text-center">
                <p className="text-brown" style={{ fontSize: 14 }}>Call activity will appear here when calls come in</p>
              </div>
            ) : (
              <div>
                {mobileCalls.map((call) => {
                  const isMissed = call.status === 'missed' || call.status === 'no-answer'
                  const isExpanded = expandedCallId === call.id
                  return (
                    <div
                      key={call.id}
                      className={cn(isMissed && 'border-l-[3px] border-l-red-500')}
                      style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                    >
                      <div className="px-4 flex items-center gap-3" style={{ minHeight: 56 }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-ink truncate" style={{ fontSize: 15, fontWeight: 600 }}>
                            {formatPhoneNumber(call.caller_number)}
                          </p>
                          <p className="text-brown mt-0.5" style={{ fontSize: 12 }}>
                            {call.status === 'missed' || call.status === 'no-answer' ? 'Missed' : call.status === 'completed' ? 'Completed' : call.status === 'recovered' ? 'Recovered' : call.status === 'in_progress' ? 'In Progress' : call.status}
                            {call.duration != null && call.duration > 0 && <> &middot; {formatDuration(call.duration)}</>}
                            {' '}&middot; {timeAgo(call.created_at)}
                          </p>
                        </div>
                        {call.recording_url && (
                          <button
                            onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-terra/10 text-terra flex-shrink-0"
                            aria-label={isExpanded ? 'Close player' : 'Play recording'}
                          >
                            <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                              {isExpanded
                                ? <><rect x="1" y="1" width="3" height="8" rx="0.5" /><rect x="6" y="1" width="3" height="8" rx="0.5" /></>
                                : <path d="M2 1.5v7l6.5-3.5L2 1.5z" />}
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className={cn('overflow-hidden transition-all duration-250', isExpanded && call.recording_url ? 'max-h-16 pb-3 px-4' : 'max-h-0')}>
                        {call.recording_url && <AudioPlayer url={call.recording_url} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>

        {/* ── Bottom Nav (56px) ── */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white flex items-center justify-around z-40" style={{ height: 56, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <NavIcon label="Home" active>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
          </NavIcon>
          <button onClick={() => setShowCallLog(true)} className="flex flex-col items-center gap-0.5 text-brown h-11 justify-center min-w-[48px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="font-medium" style={{ fontSize: 10 }}>Calls</span>
          </button>
          <NavIcon label="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </NavIcon>
          <div className="relative flex flex-col items-center gap-0.5 text-brown h-11 justify-center min-w-[48px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="font-medium" style={{ fontSize: 10 }}>Alerts</span>
            {missedCalls > 0 && (
              <span className="absolute -top-0.5 right-0 min-w-[16px] h-4 bg-red-500 text-white rounded-full flex items-center justify-center px-1" style={{ fontSize: 9, fontWeight: 700 }}>
                {missedCalls > 9 ? '9+' : missedCalls}
              </span>
            )}
          </div>
        </nav>

        {/* ── Call Log Bottom Sheet ── */}
        {showCallLog && (
          <CallLogSheet
            calls={calls} totalCalls={totalCalls} loading={loading}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            statusTabs={statusTabs} page={page} setPage={setPage}
            totalPages={totalPages} showFrom={showFrom} showTo={showTo}
            onClose={() => setShowCallLog(false)}
          />
        )}

        {/* ── Chart Detail Sheet ── */}
        {showChart && (
          <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={() => setShowChart(false)}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-4 max-h-[80vh] overflow-y-auto"
              style={{ boxShadow: '0 -8px 24px rgba(0,0,0,0.08)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <h2 className="text-ink font-bold mb-4" style={{ fontSize: 16 }}>Call Volume by Hour</h2>
              <HorizontalBarChart data={chartData} />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DESKTOP / TABLET LAYOUT (≥ 768px)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="dashboard" restaurantName="Spice Garden" connected={connected} />

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-ink text-cream px-4 py-3 rounded-2xl text-sm font-medium" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          {toast}
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 lg:px-8 py-6 space-y-6">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Total Calls" value={totalCallsNum} loading={loading} accent="terra" />
          <SummaryCard
            label="Missed"
            value={missedCalls}
            loading={loading}
            accent={missedCalls > 0 ? 'danger' : 'success'}
            highlight={missedCalls > 0}
          />
          <SummaryCard
            label="Recovered"
            value={recoveredCalls}
            loading={loading}
            accent="success"
            subtitle={`${recoveryRate}% recovery rate`}
          />
          <SummaryCard label="Avg Response" value={avgResponseMin} loading={loading} accent="terra" />
        </div>

        {/* ── Bar Chart ── */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h2 className="text-ink font-bold mb-4" style={{ fontSize: 16 }}>Call Volume</h2>
          {chartLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-terra border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <BarChart data={chartData} />
          )}
        </div>

        {/* ── Call Log ── */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div className="px-6 pt-6 pb-0">
            <h2 className="text-ink font-bold mb-4" style={{ fontSize: 16 }}>Call Log</h2>
            <Tabs tabs={statusTabs} activeTab={statusFilter} onChange={(id) => setStatusFilter(id as CallStatusFilter)} />
          </div>

          {loading ? (
            <div className="px-6 py-4 space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 py-3.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="w-8 h-8 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-1/3" />
                    <div className="h-3 bg-gray-50 rounded w-1/5" />
                  </div>
                  <div className="h-5 bg-gray-100 rounded-full w-16" />
                  <div className="h-3 bg-gray-50 rounded w-12" />
                </div>
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-brown" style={{ fontSize: 14 }}>Call activity will appear here when calls come in</p>
            </div>
          ) : (
            <div>
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="px-6 flex items-center gap-3 hover:bg-cream/40 transition-all duration-150"
                  style={{ minHeight: 56, borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <div className="w-8 h-8 rounded-full bg-terra/8 flex items-center justify-center flex-shrink-0">
                    <PhoneIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-ink truncate" style={{ fontSize: 14, fontWeight: 600 }}>
                      {formatPhoneNumber(call.caller_number)}
                    </span>
                    <span className="text-brown ml-2" style={{ fontSize: 12 }}>
                      {timeAgo(call.created_at)}
                    </span>
                  </div>
                  <Badge status={call.status} />
                  {call.duration != null && call.duration > 0 && (
                    <span className="text-brown tabular-nums" style={{ fontSize: 12 }}>{formatDuration(call.duration)}</span>
                  )}
                  {call.recording_url && (
                    <div className="w-44 flex-shrink-0">
                      <AudioPlayer url={call.recording_url} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalCalls > 0 && (
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <span className="text-brown" style={{ fontSize: 13 }}>
                Showing {showFrom}–{showTo} of {totalCalls}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SummaryCard({ label, value, loading, accent, subtitle, highlight }: {
  label: string; value: number | string; loading: boolean
  accent: 'terra' | 'success' | 'danger'; subtitle?: string; highlight?: boolean
}) {
  const accentColor = { terra: 'text-terra', success: 'text-green-500', danger: 'text-red-500' }[accent]

  return (
    <div
      className={cn('bg-white rounded-2xl p-5', highlight && 'border-l-[3px] border-l-red-500')}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      <p className="text-brown font-medium uppercase" style={{ fontSize: 12, letterSpacing: '0.05em' }}>{label}</p>
      {loading ? (
        <div className="mt-2 h-9 w-14 bg-gray-100 rounded animate-pulse" />
      ) : (
        <>
          <p className={cn('font-extrabold mt-1', accentColor)} style={{ fontSize: 32, letterSpacing: '-0.04em', lineHeight: 1 }}>
            {value}
          </p>
          {subtitle && <p className="text-brown mt-1.5" style={{ fontSize: 12 }}>{subtitle}</p>}
        </>
      )}
    </div>
  )
}

function NavIcon({ label, active, children }: { label: string; active?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col items-center gap-0.5 h-11 justify-center min-w-[48px]', active ? 'text-terra' : 'text-brown')}>
      {children}
      <span className="font-medium" style={{ fontSize: 10 }}>{label}</span>
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E0602A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function CallLogSheet({ calls, totalCalls, loading, statusFilter, setStatusFilter, statusTabs, page, setPage, totalPages, showFrom, showTo, onClose }: {
  calls: CallRecord[]; totalCalls: number; loading: boolean
  statusFilter: CallStatusFilter; setStatusFilter: (f: CallStatusFilter) => void
  statusTabs: { id: string; label: string; count?: number }[]
  page: number; setPage: (fn: (p: number) => number) => void
  totalPages: number; showFrom: number; showTo: number; onClose: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }} onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl flex flex-col"
        style={{ height: 'calc(100vh - 56px)', boxShadow: '0 -8px 24px rgba(0,0,0,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-4 pt-2 pb-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-ink font-bold" style={{ fontSize: 16 }}>All Calls</h2>
            <button onClick={onClose} className="text-brown font-medium h-8 flex items-center" style={{ fontSize: 13 }}>Close</button>
          </div>
          <Tabs tabs={statusTabs} activeTab={statusFilter} onChange={(id) => setStatusFilter(id as CallStatusFilter)} />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-3 space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3" style={{ minHeight: 56 }}>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/5" />
                    <div className="h-3 bg-gray-50 rounded w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-brown" style={{ fontSize: 14 }}>No calls found for this filter</p>
            </div>
          ) : (
            <div>
              {calls.map((call) => {
                const isMissed = call.status === 'missed' || call.status === 'no-answer'
                const isExpanded = expandedId === call.id
                return (
                  <div
                    key={call.id}
                    className={cn(isMissed && 'border-l-[3px] border-l-red-500')}
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                  >
                    <div className="px-4 flex items-center gap-3" style={{ minHeight: 56 }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink truncate" style={{ fontSize: 15, fontWeight: 600 }}>
                          {formatPhoneNumber(call.caller_number)}
                        </p>
                        <p className="text-brown mt-0.5" style={{ fontSize: 12 }}>
                          {call.status === 'missed' || call.status === 'no-answer' ? 'Missed' : call.status === 'completed' ? 'Completed' : call.status}
                          {call.duration != null && call.duration > 0 && <> &middot; {formatDuration(call.duration)}</>}
                          {' '}&middot; {timeAgo(call.created_at)}
                        </p>
                      </div>
                      {call.recording_url && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : call.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-terra/10 text-terra flex-shrink-0"
                          aria-label={isExpanded ? 'Close player' : 'Play recording'}
                        >
                          <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                            {isExpanded
                              ? <><rect x="1" y="1" width="3" height="8" rx="0.5" /><rect x="6" y="1" width="3" height="8" rx="0.5" /></>
                              : <path d="M2 1.5v7l6.5-3.5L2 1.5z" />}
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className={cn('overflow-hidden transition-all duration-250', isExpanded && call.recording_url ? 'max-h-16 pb-3 px-4' : 'max-h-0')}>
                      {call.recording_url && <AudioPlayer url={call.recording_url} />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {totalCalls > 0 && (
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <span className="text-brown" style={{ fontSize: 12 }}>
              {showFrom}–{showTo} of {totalCalls}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
