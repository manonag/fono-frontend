'use client'

import { useState, useEffect, useCallback } from 'react'
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

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadChart() }, [loadChart])
  useEffect(() => { setPage(1) }, [statusFilter])

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

  // Mobile: show only 5 most recent
  const mobileCalls = calls.slice(0, 5)

  if (isMobile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col pb-16">
        {/* Mobile Header */}
        <header className="bg-terra-dark px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-lg leading-tight">Spice Garden</p>
            <p className="text-white/50 text-[10px]">Powered by fono</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'w-2 h-2 rounded-full',
              connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            )} />
            <span className="text-white/70 text-xs font-medium">
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>
        </header>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-4 right-4 z-50 bg-ink text-cream px-4 py-3 rounded-xl shadow-lg animate-slide-in-top text-sm font-medium text-center">
            {toast}
          </div>
        )}

        <main className="flex-1 px-4 py-4 space-y-4">
          {/* Hero Stat */}
          {loading ? (
            <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
              <div className="h-10 w-32 bg-gray-200 rounded mx-auto" />
              <div className="h-4 w-48 bg-gray-100 rounded mx-auto mt-3" />
            </div>
          ) : (
            <div className="bg-white rounded-xl p-5 shadow-sm text-center">
              {missedCalls > 0 ? (
                <>
                  <p className="text-red-500 text-[32px] font-bold leading-none">
                    {missedCalls}
                  </p>
                  <p className="text-red-500 text-sm font-medium mt-1">
                    missed call{missedCalls !== 1 ? 's' : ''}
                  </p>
                </>
              ) : (
                <p className="text-green-500 text-2xl font-bold">
                  All caught up!
                </p>
              )}
              <p className="text-brown text-xs mt-3">
                {totalCallsNum} total &middot; {answeredCalls} answered &middot; {recoveredCalls} recovered
              </p>
            </div>
          )}

          {/* Sparkline / Chart */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-ink">Call Volume</h2>
              <button
                onClick={() => setShowChart(true)}
                className="text-xs text-terra font-medium"
              >
                Expand
              </button>
            </div>
            {chartLoading ? (
              <div className="h-10 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="h-10 flex items-end gap-[2px]">
                {chartData.map((d) => {
                  const total = d.answered + d.missed + d.recovered
                  const maxVal = Math.max(...chartData.map((p) => p.answered + p.missed + p.recovered), 1)
                  const height = total > 0 ? Math.max((total / maxVal) * 36, 2) : 0
                  return (
                    <div
                      key={d.hour}
                      className="flex-1 rounded-t-sm"
                      style={{
                        height: `${height}px`,
                        backgroundColor: d.missed > 0 ? '#EF4444' : total > 0 ? '#22C55E' : 'transparent',
                        opacity: total > 0 ? 1 : 0.15,
                        minHeight: total > 0 ? '2px' : undefined,
                      }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Calls */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-ink">Recent Calls</h2>
                {totalCalls > 0 && (
                  <span className="text-[10px] font-medium bg-terra/10 text-terra px-1.5 py-0.5 rounded-full">
                    {totalCalls}
                  </span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="px-4 pb-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-200 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : mobileCalls.length === 0 ? (
              <div className="px-4 pb-6 pt-2 text-center text-brown text-sm">
                No calls yet.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {mobileCalls.map((call) => {
                  const isMissed = call.status === 'missed' || call.status === 'no-answer'
                  const isExpanded = expandedCallId === call.id
                  return (
                    <div
                      key={call.id}
                      className={cn(
                        'px-4 py-3 transition-colors',
                        isMissed && 'border-l-[3px] border-l-red-500'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {/* Phone number + time */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">
                            {formatPhoneNumber(call.caller_number)}
                          </p>
                          <p className="text-xs text-brown mt-0.5">{timeAgo(call.created_at)}</p>
                        </div>
                        {/* Badge */}
                        <Badge status={call.status} />
                        {/* Play icon */}
                        {call.recording_url && (
                          <button
                            onClick={() => setExpandedCallId(isExpanded ? null : call.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-terra/10 text-terra flex-shrink-0"
                            aria-label="Play recording"
                          >
                            {isExpanded ? (
                              <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                                <rect x="1" y="1" width="3" height="8" rx="0.5" />
                                <rect x="6" y="1" width="3" height="8" rx="0.5" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                                <path d="M2 1.5v7l6.5-3.5L2 1.5z" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                      {/* Expanded audio player */}
                      {isExpanded && call.recording_url && (
                        <div className="mt-2 pl-0">
                          <AudioPlayer url={call.recording_url} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {totalCalls > 5 && (
              <button
                onClick={() => setShowCallLog(true)}
                className="w-full py-3 text-sm font-medium text-terra border-t border-gray-100 hover:bg-cream/50 transition-colors"
              >
                View all calls &rarr;
              </button>
            )}
          </div>
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-gray-200 flex items-center justify-around z-40">
          <NavIcon label="Dashboard" active>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1" />
              <rect x="14" y="3" width="7" height="5" rx="1" />
              <rect x="14" y="12" width="7" height="9" rx="1" />
              <rect x="3" y="16" width="7" height="5" rx="1" />
            </svg>
          </NavIcon>
          <button onClick={() => setShowCallLog(true)} className="flex flex-col items-center gap-0.5 text-brown">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <span className="text-[10px]">Calls</span>
          </button>
          <NavIcon label="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </NavIcon>
          <div className="relative flex flex-col items-center gap-0.5 text-brown">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="text-[10px]">Alerts</span>
            {missedCalls > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {missedCalls > 9 ? '9+' : missedCalls}
              </span>
            )}
          </div>
        </nav>

        {/* Call Log Bottom Sheet */}
        {showCallLog && (
          <CallLogSheet
            calls={calls}
            totalCalls={totalCalls}
            loading={loading}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            statusTabs={statusTabs}
            page={page}
            setPage={setPage}
            totalPages={totalPages}
            showFrom={showFrom}
            showTo={showTo}
            onClose={() => setShowCallLog(false)}
          />
        )}

        {/* Chart Expand Sheet */}
        {showChart && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowChart(false)}>
            <div
              className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              <h2 className="text-base font-semibold text-ink mb-3">Call Volume by Hour</h2>
              <HorizontalBarChart data={chartData} />
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── DESKTOP LAYOUT ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="dashboard" restaurantName="Spice Garden" connected={connected} />

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-ink text-cream px-4 py-3 rounded-xl shadow-lg animate-slide-in-top text-sm font-medium">
          {toast}
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 py-6 space-y-6">
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Total Calls" value={totalCallsNum} loading={loading} accent="terra" />
          <SummaryCard
            label="Missed Calls"
            value={missedCalls}
            loading={loading}
            accent={missedCalls > 0 ? 'danger' : 'success'}
          />
          <SummaryCard
            label="Recovered"
            value={recoveredCalls}
            loading={loading}
            accent="success"
            subtitle={`${recoveryRate}% recovery rate`}
          />
          <SummaryCard
            label="Avg Response"
            value={avgResponseMin}
            loading={loading}
            accent="terra"
          />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-ink mb-3">Call Volume</h2>
          {chartLoading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-terra border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <BarChart data={chartData} />
          )}
        </div>

        {/* Call log */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-base font-semibold text-ink mb-4">Call Log</h2>
            <Tabs
              tabs={statusTabs}
              activeTab={statusFilter}
              onChange={(id) => setStatusFilter(id as CallStatusFilter)}
            />
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full w-20" />
                </div>
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="p-8 text-center text-brown">No calls found for this filter.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {calls.map((call) => (
                <div key={call.id} className="px-6 py-4 flex items-center gap-3 hover:bg-cream/50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-terra/10 flex items-center justify-center flex-shrink-0">
                    <PhoneIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-ink text-sm truncate">
                        {formatPhoneNumber(call.caller_number)}
                      </span>
                      <Badge status={call.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-brown">{timeAgo(call.created_at)}</span>
                      {call.duration != null && call.duration > 0 && (
                        <>
                          <span className="text-brown/40">&middot;</span>
                          <span className="text-xs text-brown">{formatDuration(call.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {call.recording_url && (
                    <div className="w-48 flex-shrink-0">
                      <AudioPlayer url={call.recording_url} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalCalls > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-brown">
                Showing {showFrom}–{showTo} of {totalCalls}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────

function SummaryCard({
  label, value, loading, accent, subtitle,
}: {
  label: string
  value: number | string
  loading: boolean
  accent: 'terra' | 'success' | 'danger'
  subtitle?: string
}) {
  const accentColor = {
    terra: 'text-terra',
    success: 'text-green-500',
    danger: 'text-red-500',
  }[accent]

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <p className="text-sm text-brown font-medium">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-16 bg-gray-200 rounded animate-pulse" />
      ) : (
        <>
          <p className={cn('text-3xl font-bold mt-1', accentColor)}>{value}</p>
          {subtitle && <p className="text-xs text-brown mt-1">{subtitle}</p>}
        </>
      )}
    </div>
  )
}

function NavIcon({ label, active, children }: { label: string; active?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('flex flex-col items-center gap-0.5', active ? 'text-terra' : 'text-brown')}>
      {children}
      <span className="text-[10px]">{label}</span>
    </div>
  )
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E0602A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function CallLogSheet({
  calls, totalCalls, loading, statusFilter, setStatusFilter,
  statusTabs, page, setPage, totalPages, showFrom, showTo, onClose,
}: {
  calls: CallRecord[]
  totalCalls: number
  loading: boolean
  statusFilter: CallStatusFilter
  setStatusFilter: (f: CallStatusFilter) => void
  statusTabs: { id: string; label: string; count?: number }[]
  page: number
  setPage: (fn: (p: number) => number) => void
  totalPages: number
  showFrom: number
  showTo: number
  onClose: () => void
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col"
        style={{ height: 'calc(100% - 60px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="px-4 pt-2 pb-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-ink">All Calls</h2>
            <button onClick={onClose} className="text-brown text-sm font-medium">Close</button>
          </div>
          <Tabs
            tabs={statusTabs}
            activeTab={statusFilter}
            onChange={(id) => setStatusFilter(id as CallStatusFilter)}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="p-8 text-center text-brown text-sm">No calls found.</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {calls.map((call) => {
                const isMissed = call.status === 'missed' || call.status === 'no-answer'
                const isExpanded = expandedId === call.id
                return (
                  <div
                    key={call.id}
                    className={cn('px-4 py-3', isMissed && 'border-l-[3px] border-l-red-500')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">
                          {formatPhoneNumber(call.caller_number)}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-brown">{timeAgo(call.created_at)}</span>
                          {call.duration != null && call.duration > 0 && (
                            <>
                              <span className="text-brown/40">&middot;</span>
                              <span className="text-xs text-brown">{formatDuration(call.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Badge status={call.status} />
                      {call.recording_url && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : call.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-terra/10 text-terra flex-shrink-0"
                          aria-label="Play recording"
                        >
                          <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
                            {isExpanded
                              ? <><rect x="1" y="1" width="3" height="8" rx="0.5" /><rect x="6" y="1" width="3" height="8" rx="0.5" /></>
                              : <path d="M2 1.5v7l6.5-3.5L2 1.5z" />
                            }
                          </svg>
                        </button>
                      )}
                    </div>
                    {isExpanded && call.recording_url && (
                      <div className="mt-2">
                        <AudioPlayer url={call.recording_url} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {totalCalls > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-brown">
              {showFrom}–{showTo} of {totalCalls}
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
