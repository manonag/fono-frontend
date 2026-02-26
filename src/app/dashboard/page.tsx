'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { DateFilterBar } from '@/components/date-filter'
import { Tabs } from '@/components/tabs'
import { Badge } from '@/components/badge'
import { AudioPlayer } from '@/components/audio-player'
import { BarChart } from '@/components/bar-chart'
import { Button } from '@/components/button'
import { useCallEvents } from '@/hooks/use-call-events'
import { fetchDashboardSummary, fetchCallLog, fetchChartData } from '@/lib/api'
import { config } from '@/lib/config'
import { cn, formatPhoneNumber, formatDuration, timeAgo } from '@/lib/utils'
import type { DashboardSummary, CallRecord, ChartDataPoint, DateFilter, CallLogFilters } from '@/types'

type CallStatusFilter = 'all' | 'completed' | 'missed' | 'recovered'

export default function DashboardPage() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [statusFilter, setStatusFilter] = useState<CallStatusFilter>('all')
  const [page, setPage] = useState(1)
  const perPage = 20

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [totalCalls, setTotalCalls] = useState(0)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

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

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadChart()
  }, [loadChart])

  // Reset page when filter changes
  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  // SSE for real-time updates
  const { connected } = useCallEvents({
    onEvent: (event) => {
      setToast(`New call from ${formatPhoneNumber(event.call.caller_number)}`)
      setTimeout(() => setToast(null), 5000)
      // Refresh data
      loadData()
      loadChart()
    },
  })

  const statusTabs = [
    { id: 'all', label: 'All', count: totalCalls },
    { id: 'missed', label: 'Missed' },
    { id: 'completed', label: 'Answered' },
    { id: 'recovered', label: 'Recovered' },
  ]

  const totalPages = Math.ceil(totalCalls / perPage)
  const showFrom = totalCalls === 0 ? 0 : (page - 1) * perPage + 1
  const showTo = Math.min(page * perPage, totalCalls)

  function mapStatusToBadge(status: CallRecord['status']): 'answered' | 'missed' | 'recovered' | 'ignored' | 'completed' | 'no-answer' {
    switch (status) {
      case 'completed': return 'completed'
      case 'missed': return 'missed'
      case 'recovered': return 'recovered'
      case 'ignored': return 'ignored'
      case 'no-answer': return 'no-answer'
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="dashboard" restaurantName="Spice Garden" connected={connected} />

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-ink text-cream px-4 py-3 rounded-xl shadow-lg animate-slide-in-top text-sm font-medium">
          {toast}
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
        {/* Date filter */}
        <DateFilterBar value={dateFilter} onChange={setDateFilter} />

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Calls"
            value={summary?.total_calls}
            loading={loading}
            accent="terra"
          />
          <SummaryCard
            label="Missed Calls"
            value={summary?.missed_calls}
            loading={loading}
            accent={summary && summary.missed_calls > 0 ? 'danger' : 'success'}
          />
          <SummaryCard
            label="Recovered"
            value={summary?.recovered_calls}
            loading={loading}
            accent="success"
            subtitle={
              summary && summary.total_calls > 0
                ? `${Math.round((summary.recovered_calls / summary.total_calls) * 100)}% recovery rate`
                : undefined
            }
          />
          <SummaryCard
            label="Avg Response"
            value={summary ? `${Math.round(summary.avg_response_time / 60)}m` : undefined}
            loading={loading}
            accent="terra"
          />
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-ink mb-4">Call Volume</h2>
          {chartLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-terra border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <BarChart data={chartData} />
          )}
        </div>

        {/* Call log */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6 pb-0">
            <h2 className="text-lg font-semibold text-ink mb-4">Call Log</h2>
            <Tabs
              tabs={statusTabs}
              activeTab={statusFilter}
              onChange={(id) => setStatusFilter(id as CallStatusFilter)}
            />
          </div>

          {loading ? (
            <div className="p-4 sm:p-6 space-y-4">
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
            <div className="p-8 text-center text-brown">
              No calls found for this filter.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="px-4 sm:px-6 py-4 flex items-center gap-3 hover:bg-cream/50 transition-colors"
                >
                  {/* Phone icon */}
                  <div className="w-10 h-10 rounded-full bg-terra/10 flex items-center justify-center flex-shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E0602A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>

                  {/* Call info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink text-sm">
                        {formatPhoneNumber(call.caller_number)}
                      </span>
                      <Badge status={mapStatusToBadge(call.status)} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-brown">{timeAgo(call.created_at)}</span>
                      {call.duration && (
                        <>
                          <span className="text-brown/40">·</span>
                          <span className="text-xs text-brown">{formatDuration(call.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Audio player */}
                  {call.recording_url && (
                    <div className="hidden sm:block w-48">
                      <AudioPlayer url={call.recording_url} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalCalls > 0 && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <span className="text-sm text-brown">
                Showing {showFrom}–{showTo} of {totalCalls}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
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

function SummaryCard({
  label,
  value,
  loading,
  accent,
  subtitle,
}: {
  label: string
  value: number | string | undefined | null
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
          <p className={cn('text-3xl font-bold mt-1', accentColor)}>
            {value ?? '—'}
          </p>
          {subtitle && (
            <p className="text-xs text-brown mt-1">{subtitle}</p>
          )}
        </>
      )}
    </div>
  )
}
