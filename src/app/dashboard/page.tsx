'use client'

/*
 * ──────────────────────────────────────────────────
 * WIREFRAME — Desktop (≥ 768px)
 * ──────────────────────────────────────────────────
 * ┌─ #C84E20 header ─────────────────────────────────┐
 * │ fono○ | Spice Garden Tracy,CA  Feb 26 [Live] (av)│
 * ├──────────┬────────────────────────────────────────┤
 * │ MENU     │ Good afternoon, Mano                   │
 * │ ▪ Dash   │ Here's how Spice Garden is doing today │
 * │ ▪ Analy  │                                        │
 * │ ▪ Calls  │ [Today] [Yesterday] [This Week] [Month]│
 * │ ▪ Setti  │                                        │
 * │ ───────  │ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
 * │ RESTAU   │ │📊 ↑12%  │ │📞 ↑ 0  │ │✅ ↑ 5% │  │
 * │ [SG] ✓   │ │  30     │ │  3      │ │  2      │  │
 * │ [BC]     │ │ Total   │ │ Missed  │ │ Recov.  │  │
 * │          │ │ ▁▂▃▅▇▅▃ │ │ ▁▂▃▅▇▅▃ │ │ ▁▂▃▅▇▅▃ │  │
 * │ (spacer) │ └─────────┘ └─────────┘ └─────────┘  │
 * │ ───────  │                                        │
 * │ ? Help   │ Recent Activity          View all →   │
 * │ → Logout │ 📞 +1 (209)..  [Badge]  2m 34s  ▶   │
 * └──────────┴────────────────────────────────────────┘
 *
 * ──────────────────────────────────────────────────
 * WIREFRAME — Mobile (< 768px)
 * ──────────────────────────────────────────────────
 * ┌─────────────────────────────────┐
 * │ (○) Spice Garden    ● Live     │  52px sticky
 * │     Tracy, CA  powered by fono │
 * ├─────────────────────────────────┤
 * │ Good afternoon                  │  20px w700
 * │ Here's today's overview         │  13px brown
 * ├─────────────────────────────────┤
 * │ [📊] 30 Total Calls   ▁▃▅▇ → │  Card
 * │ [📞] 3 Missed         ▁▃▅▇ → │  Card (red border)
 * │ [✅] 2 Recovered      ▁▃▅▇ → │  Card
 * ├─────────────────────────────────┤
 * │ 📊Home  📞Calls  ⚙Set  🔔3  │  64px bottom nav
 * └─────────────────────────────────┘
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { Badge } from '@/components/badge'
import { AudioPlayer } from '@/components/audio-player'
import { useCallEvents } from '@/hooks/use-call-events'
import { useMediaQuery } from '@/hooks/use-media-query'
import { fetchDashboardSummary, fetchCallLog, fetchChartData } from '@/lib/api'
import { config } from '@/lib/config'
import { formatPhoneNumber, formatDuration, timeAgo } from '@/lib/utils'
import type { DashboardSummary, CallRecord, ChartDataPoint, DateFilter } from '@/types'

function safeNum(n: unknown): number {
  const num = Number(n)
  return isNaN(num) ? 0 : num
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

type DatePill = { id: DateFilter; label: string }
const DATE_PILLS: DatePill[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
]

export default function DashboardPage() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)

  const tenantId = config.tenantId

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryData, callData] = await Promise.all([
        fetchDashboardSummary(tenantId),
        fetchCallLog(tenantId, { status: 'all', page: 1, perPage: 5 }),
      ])
      setSummary(summaryData)
      setCalls(callData.calls)
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

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

  const { connected } = useCallEvents({
    onEvent: () => {
      loadData()
      loadChart()
    },
  })

  const missedCalls = safeNum(summary?.missed_calls)
  const totalCallsNum = safeNum(summary?.total_calls)
  const recoveredCalls = safeNum(summary?.recovered_calls)

  // Build mini chart bar data per card from chartData
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MOBILE LAYOUT (< 768px)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (isMobile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col" style={{ paddingBottom: 64 }}>
        <Header variant="dashboard" restaurantName="Spice Garden" connected={connected} isMobile />

        <main className="flex-1 px-4 pt-5 pb-4">
          {/* Greeting */}
          <div className="mb-5">
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1E0E00' }}>{getGreeting()}</h1>
            <p style={{ fontSize: 13, color: '#8B7355', marginTop: 2 }}>Here&apos;s today&apos;s overview</p>
          </div>

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
                />
              </>
            )}
          </div>
        </main>

        <MobileNav activeItem="dashboard" missedCount={missedCalls} />
      </div>
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // DESKTOP LAYOUT (≥ 768px)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="dashboard" restaurantName="Spice Garden" connected={connected} />

      <div className="flex flex-1">
        <Sidebar activeItem="dashboard" missedCount={missedCalls} />

        <main className="flex-1 overflow-y-auto" style={{ padding: '36px 40px' }}>
          <div style={{ maxWidth: 960 }}>
            {/* Greeting */}
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#1E0E00' }}>
                {getGreeting()}, Mano
              </h1>
              <p style={{ fontSize: 14, color: '#8B7355', marginTop: 4 }}>
                Here&apos;s how Spice Garden is doing today
              </p>
            </div>

            {/* Date Filter Pills */}
            <div className="flex items-center gap-1.5" style={{ marginBottom: 28 }}>
              {DATE_PILLS.map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setDateFilter(pill.id)}
                  className="transition-all"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 500,
                    backgroundColor: dateFilter === pill.id ? '#E0602A' : '#fff',
                    color: dateFilter === pill.id ? '#fff' : '#5C3D22',
                    border: dateFilter === pill.id ? 'none' : '1px solid rgba(0,0,0,0.06)',
                    boxShadow: dateFilter === pill.id ? '0 2px 8px rgba(224,96,42,0.25)' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {pill.label}
                </button>
              ))}
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
                  />
                </>
              )}
            </div>

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
                <button
                  className="flex items-center gap-1 transition-colors hover:opacity-80"
                  style={{ fontSize: 13, fontWeight: 600, color: '#E0602A' }}
                >
                  View all calls
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                  </svg>
                </button>
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
// Desktop Metric Card
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DesktopMetricCard({ icon, iconBg, iconColor, label, value, valueColor, highlight, bars, barColor, chartLoading }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; label: string
  value: number; valueColor?: string; highlight?: boolean
  bars: number[]; barColor: string; chartLoading: boolean
}) {
  return (
    <div
      className="bg-white cursor-pointer transition-all duration-150 hover:-translate-y-[3px]"
      style={{
        borderRadius: 20,
        padding: 28,
        border: '1px solid rgba(0,0,0,0.04)',
        borderLeft: highlight ? '4px solid #EF4444' : '1px solid rgba(0,0,0,0.04)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* Top row: icon + change pill */}
      <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: iconBg }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.04)',
            color: '#8B7355',
          }}
        >
          —
        </span>
      </div>

      {/* Number + Label */}
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

      {/* Mini chart + arrow */}
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
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(224,96,42,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2">
            <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mobile Metric Card
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MobileMetricCard({ icon, iconBg, label, value, valueColor, highlight, bars, barColor, chartLoading }: {
  icon: React.ReactNode; iconBg: string; label: string
  value: number; valueColor?: string; highlight?: boolean
  bars: number[]; barColor: string; chartLoading: boolean
}) {
  return (
    <div
      className="bg-white flex items-center gap-4"
      style={{
        borderRadius: 18,
        padding: 20,
        borderLeft: highlight ? '4px solid #EF4444' : undefined,
      }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: iconBg }}
      >
        {icon}
      </div>

      {/* Label + Number */}
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

      {/* Mini chart + chevron */}
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
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Mini Chart (bar sparkline)
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
// Activity Row (desktop recent calls)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ActivityRow({ call, isLast }: { call: CallRecord; isLast: boolean }) {
  const isMissed = call.status === 'missed' || call.status === 'no-answer'
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
      {/* Status icon */}
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

      {/* Phone + meta */}
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontSize: 14, fontWeight: 600, color: '#1E0E00' }}>
          {formatPhoneNumber(call.caller_number)}
        </p>
        <p style={{ fontSize: 12, color: '#8B7355' }}>
          {call.duration != null && call.duration > 0 ? formatDuration(call.duration) : 'Inbound'}
          {' '}&middot; Inbound
        </p>
      </div>

      {/* Badge */}
      <Badge status={call.status} />

      {/* Time */}
      <span style={{ fontSize: 12, color: '#B0A090', minWidth: 50, textAlign: 'right' }}>
        {timeAgo(call.created_at)}
      </span>

      {/* Play button */}
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
// Skeleton Cards
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
// SVG Icons for cards
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
