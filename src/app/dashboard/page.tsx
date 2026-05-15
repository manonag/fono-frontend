'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { UserMenu } from '@/components/user-menu'
import { Badge } from '@/components/badge'
import { AudioPlayer } from '@/components/audio-player'
import { useCallEvents } from '@/hooks/use-call-events'
import { useMediaQuery } from '@/hooks/use-media-query'
import { fetchDashboardSummary, fetchCallLog, fetchChartData, fetchCombinedSummary, fetchCombinedCallLog, fetchTenantStats, fetchCombinedStats } from '@/lib/api'
import type { TenantStats } from '@/lib/api'
import { useRestaurant } from '@/lib/restaurant-context'
import { useFonoToken } from '@/hooks/use-fono-token'
import { config } from '@/lib/config'
import { formatPhoneNumber, formatDuration, timeAgo } from '@/lib/utils'
import { DateFilterBar, getDateRangeForFilter } from '@/components/date-filter'
import type { CallRecord, ChartDataPoint, DateFilter } from '@/types'

function safeNum(n: unknown): number {
  const num = Number(n)
  return isNaN(num) ? 0 : num
}

interface CustomDateRange { from: string; to: string }

export default function DashboardPage() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [customRange, setCustomRange] = useState<CustomDateRange | undefined>()

  const [summary, setSummary] = useState<{ total_calls: number; missed_calls: number; answered_calls: number; total_duration_seconds: number; total_recordings: number; period: string } | null>(null)
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [allCalls, setAllCalls] = useState<CallRecord[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)

  const { tenantId, isAll, allTenantIds, current } = useRestaurant()
  const token = useFonoToken()
  const [forwardingVerified, setForwardingVerified] = useState(true)

  // Single-tenant view uses the tenant's TZ for calendar-day math. The
  // All-Restaurants view picks one anchor — see fetchCombinedSummary's
  // contract — and we use the admin viewer's resolved TZ from the first
  // tenant in the portfolio as that anchor. Browser TZ would also be
  // defensible; this is consistent with how the iframe impersonation
  // path inherits the impersonated tenant's TZ.
  const activeTimezone = current.timezone

  useEffect(() => {
    const tid = isAll ? allTenantIds[0] : tenantId
    if (!tid || tid === 'all' || !token) return
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/tenants/${tid}/forwarding-status`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data) setForwardingVerified(data.verified) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isAll, allTenantIds, tenantId, token])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { dateFrom, dateTo } = getDateRangeForFilter(
        dateFilter,
        customRange,
        activeTimezone,
      )
      const summaryWindow = { dateFrom, dateTo }
      if (isAll) {
        const [summaryData, callData, allCallData, statsData] = await Promise.all([
          fetchCombinedSummary(allTenantIds, summaryWindow, token),
          fetchCombinedCallLog(allTenantIds, { status: 'all', page: 1, perPage: 5, dateFrom, dateTo }, token),
          fetchCombinedCallLog(allTenantIds, { status: 'all', page: 1, perPage: 100, dateFrom, dateTo }, token),
          fetchCombinedStats(allTenantIds, summaryWindow, token).catch(() => null),
        ])
        setSummary(summaryData)
        setCalls(callData.calls)
        setAllCalls(allCallData.calls)
        setStats(statsData)
      } else {
        const [summaryData, callData, allCallData, statsData] = await Promise.all([
          fetchDashboardSummary(tenantId, summaryWindow, token),
          fetchCallLog(tenantId, { status: 'all', page: 1, perPage: 5, dateFrom, dateTo }, token),
          fetchCallLog(tenantId, { status: 'all', page: 1, perPage: 100, dateFrom, dateTo }, token),
          fetchTenantStats(tenantId, summaryWindow, token).catch(() => null),
        ])
        setSummary(summaryData)
        setCalls(callData.calls)
        setAllCalls(allCallData.calls)
        setStats(statsData)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [tenantId, isAll, allTenantIds, dateFilter, customRange, activeTimezone, token])

  const loadChart = useCallback(async () => {
    setChartLoading(true)
    try {
      const tid = isAll ? allTenantIds[0] : tenantId
      const { dateFrom, dateTo } = getDateRangeForFilter(
        dateFilter,
        customRange,
        activeTimezone,
      )
      const data = await fetchChartData(tid, { dateFrom, dateTo }, token)
      setChartData(data)
    } catch {
      // silently fail
    } finally {
      setChartLoading(false)
    }
  }, [tenantId, dateFilter, customRange, activeTimezone, isAll, allTenantIds, token])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => { loadChart() }, [loadChart])

  const { connected } = useCallEvents({
    onEvent: () => {
      loadData()
      loadChart()
    },
  })

  const missedCalls = safeNum(summary?.missed_calls)
  const totalCallsNum = safeNum(summary?.total_calls)
  const recoveredCalls = allCalls.filter(c => c.status === 'recovered').length

  // Build mini chart bar data per card
  const miniChartBars = useMemo(() => {
    if (chartData.length === 0) return { total: [], missed: [], recovered: [] }
    const maxTotal = Math.max(...chartData.map(d => d.answered + d.missed + d.recovered), 1)
    const maxMissed = Math.max(...chartData.map(d => d.missed), 1)
    const maxRecovered = Math.max(...chartData.map(d => d.recovered), 1)
    return {
      total: chartData.map(d => (d.answered + d.missed + d.recovered) / maxTotal),
      missed: chartData.map(d => d.missed / maxMissed),
      recovered: chartData.map(d => d.recovered / maxRecovered),
    }
  }, [chartData])

  // Compute insight box data (use server stats when available, fallback to client-side)
  const insights = useMemo(() => {
    const peakHour = chartData.reduce<ChartDataPoint | null>((best, d) => {
      const total = d.answered + d.missed + d.recovered
      if (!best) return d
      return total > (best.answered + best.missed + best.recovered) ? d : best
    }, null)
    const peakLabel = peakHour ? peakHour.label : '—'
    const peakCount = peakHour ? peakHour.answered + peakHour.missed + peakHour.recovered : 0

    // Recovery rate comes from /tenants/{id}/stats only. The previous
    // client-side fallback used summary.missed_calls (NO_ANSWER + FAILED)
    // as the denominator while the primary uses NO_ANSWER-only — those
    // produce different numbers, and showing a "made-up" rate was worse
    // UX than admitting the metric is unavailable. Sprint c630d5f1 A5.
    const recoveryRate: number | null = stats ? Math.round(stats.recovery_rate) : null

    const avgCallSecs = stats
      ? Math.round(stats.avg_duration_seconds)
      : (() => {
          const avgDuration = safeNum(summary?.total_duration_seconds)
          const answeredCalls = safeNum(summary?.answered_calls)
          return answeredCalls > 0 ? Math.round(avgDuration / answeredCalls) : 0
        })()

    // Repeat callers (still client-side, not in stats endpoint)
    const callerCounts = new Map<string, number>()
    allCalls.forEach(c => callerCounts.set(c.caller_number, (callerCounts.get(c.caller_number) || 0) + 1))
    const repeatCallers = Array.from(callerCounts.values()).filter(c => c > 1).length

    return { peakLabel, peakCount, recoveryRate, avgCallSecs, repeatCallers }
  }, [chartData, stats, summary, allCalls])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MOBILE LAYOUT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isMobile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col" style={{ paddingBottom: 64 }}>
        <Header variant="dashboard" restaurantName={isAll ? 'All Restaurants' : current.name} connected={connected} isMobile userMenu={<UserMenu />} />

        <main className="flex-1 px-4 pt-5 pb-4">
          {/* Forwarding Setup Banner (Mobile) */}
          {!forwardingVerified && (
            <Link
              href="/settings?tab=forwarding"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
                marginBottom: 16,
                textDecoration: 'none',
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#F59E0B', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E', flex: 1 }}>Set up call forwarding</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
            </Link>
          )}

          {/* Stacked Cards */}
          <div className="flex flex-col gap-3">
            {loading ? (
              <>
                <MobileCardSkeleton />
                <MobileCardSkeleton />
                <MobileCardSkeleton />
              </>
            ) : (
              <>
                <MobileMetricCard
                  icon={<TotalIcon />}
                  iconBg="rgba(224,96,42,0.08)"
                  label="Total Calls"
                  value={totalCallsNum}
                  bars={miniChartBars.total}
                  barColor="rgba(224,96,42,0.15)"
                  chartLoading={chartLoading}
                  href="/calls"
                />
                <MobileMetricCard
                  icon={<MissedIcon />}
                  iconBg="rgba(239,68,68,0.08)"
                  label="Missed"
                  value={missedCalls}
                  valueColor={missedCalls > 0 ? '#EF4444' : undefined}
                  highlight={missedCalls > 0}
                  bars={miniChartBars.missed}
                  barColor="rgba(239,68,68,0.15)"
                  chartLoading={chartLoading}
                  href="/calls?status=missed"
                />
                <MobileMetricCard
                  icon={<RecoveredIcon />}
                  iconBg="rgba(34,197,94,0.08)"
                  label="Recovered"
                  value={recoveredCalls}
                  valueColor="#22C55E"
                  bars={miniChartBars.recovered}
                  barColor="rgba(34,197,94,0.15)"
                  chartLoading={chartLoading}
                  href="/calls?status=recovered"
                />
              </>
            )}
          </div>

          {/* Insight Boxes — mobile: 2 per row */}
          {!loading && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <InsightBox
                icon={<ClockIcon />}
                label="Peak Hour"
                value={insights.peakLabel}
                sub={`${insights.peakCount} calls`}
              />
              <InsightBox
                icon={<PercentIcon />}
                label="Recovery Rate"
                value={insights.recoveryRate === null ? '—' : `${insights.recoveryRate}%`}
                sub={insights.recoveryRate === null ? 'unavailable' : 'of missed'}
              />
              <InsightBox
                icon={<TimerIcon />}
                label="Avg Call"
                value={formatDuration(insights.avgCallSecs)}
                sub="duration"
              />
              <InsightBox
                icon={<RepeatIcon />}
                label="Repeat Callers"
                value={String(insights.repeatCallers)}
                sub="this period"
              />
            </div>
          )}
        </main>

        <MobileNav missedCount={missedCalls} />
      </div>
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DESKTOP LAYOUT
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="dashboard" restaurantName={isAll ? 'All Restaurants' : current.name} connected={connected} userMenu={<UserMenu />} />

      <div className="flex flex-1">
        <Sidebar missedCount={missedCalls} />

        <main className="flex-1 overflow-y-auto" style={{ padding: '36px 40px' }}>
          <div style={{ maxWidth: 960 }}>
            {/* Forwarding Setup Banner */}
            {!forwardingVerified && (
              <Link
                href="/settings?tab=forwarding"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 20px',
                  borderRadius: 14,
                  backgroundColor: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  marginBottom: 20,
                  textDecoration: 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>Set up call forwarding</p>
                  <p style={{ fontSize: 12, color: '#92400E', opacity: 0.8 }}>Forward your restaurant calls to Fono so we can answer them</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            )}

            {/* Date Filter Pills */}
            <div style={{ marginBottom: 28 }}>
              <DateFilterBar
                value={dateFilter}
                onChange={setDateFilter}
                customRange={customRange}
                onCustomRange={setCustomRange}
              />
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-3 gap-5" style={{ marginBottom: 28 }}>
              {loading ? (
                <>
                  <DesktopCardSkeleton />
                  <DesktopCardSkeleton />
                  <DesktopCardSkeleton />
                </>
              ) : (
                <>
                  <DesktopMetricCard
                    icon={<TotalIcon />}
                    iconBg="rgba(224,96,42,0.08)"
                    iconColor="#E0602A"
                    label="Total Calls"
                    value={totalCallsNum}
                    bars={miniChartBars.total}
                    barColor="rgba(224,96,42,0.15)"
                    chartLoading={chartLoading}
                    href="/calls"
                  />
                  <DesktopMetricCard
                    icon={<MissedIcon />}
                    iconBg="rgba(239,68,68,0.08)"
                    iconColor="#EF4444"
                    label="Missed"
                    value={missedCalls}
                    valueColor={missedCalls > 0 ? '#EF4444' : undefined}
                    highlight={missedCalls > 0}
                    bars={miniChartBars.missed}
                    barColor="rgba(239,68,68,0.15)"
                    chartLoading={chartLoading}
                    href="/calls?status=missed"
                  />
                  <DesktopMetricCard
                    icon={<RecoveredIcon />}
                    iconBg="rgba(34,197,94,0.08)"
                    iconColor="#22C55E"
                    label="Recovered"
                    value={recoveredCalls}
                    valueColor="#22C55E"
                    bars={miniChartBars.recovered}
                    barColor="rgba(34,197,94,0.15)"
                    chartLoading={chartLoading}
                    href="/calls?status=recovered"
                  />
                </>
              )}
            </div>

            {/* Insight Boxes — 4 per row desktop */}
            {!loading && (
              <div className="grid grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
                <InsightBox
                  icon={<ClockIcon />}
                  label="Peak Hour"
                  value={insights.peakLabel}
                  sub={`${insights.peakCount} calls`}
                />
                <InsightBox
                  icon={<PercentIcon />}
                  label="Recovery Rate"
                  value={insights.recoveryRate === null ? '—' : `${insights.recoveryRate}%`}
                  sub={insights.recoveryRate === null ? 'unavailable' : 'of missed'}
                />
                <InsightBox
                  icon={<TimerIcon />}
                  label="Avg Call Duration"
                  value={formatDuration(insights.avgCallSecs)}
                  sub="per answered call"
                />
                <InsightBox
                  icon={<RepeatIcon />}
                  label="Repeat Callers"
                  value={String(insights.repeatCallers)}
                  sub="this period"
                />
              </div>
            )}

            {/* Recent Activity */}
            <div
              className="bg-white"
              style={{
                borderRadius: 20,
                padding: '24px 28px',
                border: '1px solid rgba(0,0,0,0.04)',
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E0E00' }}>Recent Activity</h2>
                <Link
                  href="/calls"
                  className="flex items-center gap-1 transition-colors hover:opacity-80"
                  style={{ fontSize: 13, fontWeight: 600, color: '#E0602A' }}
                >
                  View all calls
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {loading ? (
                <div className="space-y-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4" style={{ height: 60, borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
                      <div className="flex-1 space-y-2">
                        <div className="skeleton" style={{ height: 14, width: '35%' }} />
                        <div className="skeleton" style={{ height: 11, width: '20%' }} />
                      </div>
                      <div className="skeleton" style={{ height: 20, width: 64, borderRadius: 9999 }} />
                      <div className="skeleton" style={{ height: 11, width: 40 }} />
                    </div>
                  ))}
                </div>
              ) : calls.length === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{ padding: '40px 0' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="1.5" style={{ opacity: 0.4 }}>
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  <p style={{ fontSize: 14, color: '#8B7355', marginTop: 12 }}>No calls yet today</p>
                  <p style={{ fontSize: 12, color: '#B0A090', marginTop: 4 }}>Call activity will appear here when calls come in</p>
                </div>
              ) : (
                <div>
                  {calls.map((call, i) => (
                    <ActivityRow key={call.id} call={call} isLast={i === calls.length - 1} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Insight Box
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function InsightBox({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub: string
}) {
  return (
    <div
      className="bg-white"
      style={{
        borderRadius: 16,
        padding: 16,
        border: '1px solid rgba(0,0,0,0.04)',
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
        <span style={{ color: '#8B7355' }}>{icon}</span>
        <span style={{ fontSize: 12, color: '#8B7355', fontWeight: 400 }}>{label}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color: '#1E0E00', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, color: '#B0A090', marginTop: 4 }}>{sub}</p>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Desktop Metric Card
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DesktopMetricCard({ icon, iconBg, iconColor, label, value, valueColor, highlight, bars, barColor, chartLoading, href }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string
  value: number; valueColor?: string; highlight?: boolean
  bars: number[]; barColor: string; chartLoading: boolean; href?: string
}) {
  return (
    <Link
      href={href || '/calls'}
      className="bg-white cursor-pointer transition-all duration-150 hover:-translate-y-[3px] block"
      style={{
        borderRadius: 20,
        padding: 28,
        border: '1px solid rgba(0,0,0,0.04)',
        borderLeft: highlight ? '4px solid #EF4444' : '1px solid rgba(0,0,0,0.04)',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
    >
      <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: iconBg }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
      </div>

      <p style={{
        fontSize: 44,
        fontWeight: 800,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        color: valueColor || '#1E0E00',
      }}>
        {value}
      </p>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#8B7355', marginTop: 4 }}>{label}</p>

      <div className="flex items-end justify-between" style={{ marginTop: 16 }}>
        <MiniChart bars={bars} color={barColor} height={48} loading={chartLoading} />
        <div
          className="flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            backgroundColor: 'rgba(0,0,0,0.03)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2">
            <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mobile Metric Card
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MobileMetricCard({ icon, iconBg, label, value, valueColor, highlight, bars, barColor, chartLoading, href }: {
  icon: React.ReactNode; iconBg: string; label: string
  value: number; valueColor?: string; highlight?: boolean
  bars: number[]; barColor: string; chartLoading: boolean; href?: string
}) {
  return (
    <Link
      href={href || '/calls'}
      className="bg-white flex items-center gap-4"
      style={{
        borderRadius: 18,
        padding: 20,
        borderLeft: highlight ? '4px solid #EF4444' : undefined,
        textDecoration: 'none',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, color: '#8B7355' }}>{label}</p>
        <p style={{
          fontSize: 32,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.04em',
          color: valueColor || '#1E0E00',
          marginTop: 2,
        }}>
          {value}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <MiniChart bars={bars} color={barColor} height={28} width={56} loading={chartLoading} />
        <div
          className="flex items-center justify-center"
          style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.03)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </Link>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mini Chart
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MiniChart({ bars, color, height = 48, width, loading }: {
  bars: number[]; color: string; height?: number; width?: number; loading?: boolean
}) {
  if (loading) {
    return <div className="skeleton" style={{ width: width || 100, height, borderRadius: 4 }} />
  }
  const displayBars = bars.length > 0 ? bars : Array(12).fill(0.05)
  return (
    <div className="flex items-end" style={{ height, width, gap: 3 }}>
      {displayBars.map((v, i) => (
        <div
          key={i}
          className="flex-1"
          style={{
            height: Math.max(v * (height - 4), 3),
            backgroundColor: color,
            borderRadius: '3px 3px 0 0',
            minWidth: 3,
          }}
        />
      ))}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Activity Row
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ActivityRow({ call, isLast }: { call: CallRecord; isLast: boolean }) {
  const isMissed = call.status === 'missed'
  const isInProgress = call.status === 'in_progress'

  const statusIconBg = isMissed
    ? 'rgba(239,68,68,0.08)'
    : isInProgress
      ? 'rgba(245,158,11,0.08)'
      : 'rgba(34,197,94,0.08)'
  const statusIconColor = isMissed ? '#EF4444' : isInProgress ? '#F59E0B' : '#22C55E'

  return (
    <div
      className="flex items-center gap-4 transition-colors hover:bg-cream/50"
      style={{
        height: 60,
        borderBottom: !isLast ? '1px solid rgba(0,0,0,0.04)' : 'none',
        borderRadius: 10,
        padding: '0 4px',
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: statusIconBg }}
      >
        {isMissed ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={statusIconColor} strokeWidth="1.8">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
            <line x1="4" y1="4" x2="20" y2="20" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={statusIconColor} strokeWidth="1.8">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: '#1E0E00' }}>
          {formatPhoneNumber(call.caller_number)}
        </p>
        <p style={{ fontSize: 12, color: '#8B7355' }}>
          {call.duration_seconds != null && call.duration_seconds > 0 ? formatDuration(call.duration_seconds) : 'Inbound'}
          {' '}&middot; Inbound
        </p>
      </div>

      <Badge status={call.status} />

      <span style={{ fontSize: 12, color: '#B0A090', minWidth: 50, textAlign: 'right' }}>
        {timeAgo(call.created_at)}
      </span>

      {call.recording_url ? (
        <PlayButton url={call.recording_url} />
      ) : (
        <div style={{ width: 32 }} />
      )}
    </div>
  )
}

function PlayButton({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false)

  if (expanded) {
    return (
      <div className="flex items-center gap-2" style={{ width: 180 }}>
        <AudioPlayer url={url} />
        <button
          onClick={() => setExpanded(false)}
          className="flex-shrink-0 text-brown hover:text-ink transition-colors"
          style={{ width: 24, height: 24 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18" /><path d="M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      className="flex items-center justify-center flex-shrink-0 rounded-full bg-terra text-white hover:bg-terra-dark transition-colors"
      style={{ width: 32, height: 32 }}
      aria-label="Play recording"
    >
      <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor">
        <path d="M2 1.5v7l6.5-3.5L2 1.5z" />
      </svg>
    </button>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Skeletons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DesktopCardSkeleton() {
  return (
    <div className="bg-white" style={{ borderRadius: 20, padding: 28, border: '1px solid rgba(0,0,0,0.04)' }}>
      <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 14 }} />
      <div className="skeleton mt-4" style={{ height: 44, width: 60 }} />
      <div className="skeleton mt-2" style={{ height: 14, width: 80 }} />
      <div className="skeleton mt-4" style={{ height: 48, width: '100%' }} />
    </div>
  )
}

function MobileCardSkeleton() {
  return (
    <div className="bg-white flex items-center gap-4" style={{ borderRadius: 18, padding: 20 }}>
      <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 14 }} />
      <div className="flex-1 space-y-2">
        <div className="skeleton" style={{ height: 12, width: 60 }} />
        <div className="skeleton" style={{ height: 28, width: 40 }} />
      </div>
      <div className="skeleton" style={{ width: 56, height: 28, borderRadius: 4 }} />
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SVG Icons
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TotalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E0602A" strokeWidth="1.8">
      <rect x="3" y="13" width="4" height="8" rx="1" />
      <rect x="10" y="9" width="4" height="12" rx="1" />
      <rect x="17" y="5" width="4" height="16" rx="1" />
    </svg>
  )
}

function MissedIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
      <line x1="4" y1="4" x2="20" y2="20" />
    </svg>
  )
}

function RecoveredIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.8">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
      <polyline points="20 6 9 17 4 12" stroke="#22C55E" strokeWidth="2" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function PercentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  )
}

function TimerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M5 3l2 2" />
      <path d="M19 3l-2 2" />
      <path d="M12 3v2" />
    </svg>
  )
}

function RepeatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  )
}
