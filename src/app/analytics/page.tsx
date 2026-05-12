'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useCallEvents } from '@/hooks/use-call-events'
import { fetchDashboardSummary, fetchCallLog, fetchPeakHours, fetchCombinedSummary, fetchCombinedCallLog } from '@/lib/api'
import { useRestaurant } from '@/lib/restaurant-context'
import { useFonoToken } from '@/hooks/use-fono-token'
import { DateFilterBar } from '@/components/date-filter'
import { resolveFilterWindow } from '@/lib/analytics-filter'
import { formatDuration } from '@/lib/utils'
import type { CallRecord, DateFilter } from '@/types'

const DEFAULT_TIMEZONE = 'America/Los_Angeles'

function safeNum(n: unknown): number {
  const num = Number(n)
  return isNaN(num) ? 0 : num
}

interface CustomDateRange { from: string; to: string }

export default function AnalyticsPage() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [dateFilter, setDateFilter] = useState<DateFilter>('month')
  const [customRange, setCustomRange] = useState<CustomDateRange | undefined>()
  const [summary, setSummary] = useState<{ total_calls: number; missed_calls: number; answered_calls: number; total_duration_seconds: number } | null>(null)
  const [calls, setCalls] = useState<CallRecord[]>([])
  const [tenantTimezone, setTenantTimezone] = useState<string>(DEFAULT_TIMEZONE)
  const [loading, setLoading] = useState(true)
  const { tenantId, isAll, allTenantIds, current } = useRestaurant()
  const token = useFonoToken()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const allCalls: CallRecord[] = []
      let page = 1
      let hasMore = true
      while (hasMore) {
        const fetcher = isAll
          ? fetchCombinedCallLog(allTenantIds, { status: 'all', page, perPage: 100 }, token)
          : fetchCallLog(tenantId, { status: 'all', page, perPage: 100 }, token)
        const result = await fetcher
        allCalls.push(...result.calls)
        hasMore = result.calls.length === 100 && page < 5
        page++
      }
      const tid = isAll ? allTenantIds[0] : tenantId
      const [summaryData, peakData] = await Promise.all([
        isAll ? fetchCombinedSummary(allTenantIds, undefined, token) : fetchDashboardSummary(tenantId, undefined, token),
        fetchPeakHours(tid, 30, token).catch(() => null),
      ])
      setSummary(summaryData)
      setCalls(allCalls)

      if (peakData?.timezone) {
        setTenantTimezone(peakData.timezone)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [tenantId, isAll, allTenantIds, token])

  useEffect(() => { loadData() }, [loadData])

  const { connected } = useCallEvents({ onEvent: loadData })

  const resolvedWindow = useMemo(
    () => resolveFilterWindow(dateFilter, customRange, tenantTimezone),
    [dateFilter, customRange, tenantTimezone]
  )

  // Filter calls by date range
  const filteredCalls = useMemo(() => {
    const from = resolvedWindow.startDate
    const to = resolvedWindow.endDate

    return calls.filter(call => {
      const d = new Date(call.created_at)
      return d >= from && d <= to
    })
  }, [calls, resolvedWindow])

  // Heatmap: 7 days × 24 hours
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    filteredCalls.forEach(call => {
      const d = new Date(call.created_at)
      const day = d.getDay() // 0=Sun
      const hour = d.getHours()
      // Convert: Sun(0)->6, Mon(1)->0, ..., Sat(6)->5
      const row = day === 0 ? 6 : day - 1
      grid[row][hour]++
    })
    return grid
  }, [filteredCalls])

  const heatmapMax = useMemo(() => Math.max(...heatmapData.flat(), 1), [heatmapData])

  // Donut chart data
  const donutData = useMemo(() => {
    let completed = 0, missed = 0, recovered = 0
    filteredCalls.forEach(c => {
      if (c.status === 'completed') completed++
      else if (c.status === 'missed' || c.status === 'no-answer') missed++
      else if (c.status === 'recovered') recovered++
    })
    return { completed, missed, recovered, total: completed + missed + recovered }
  }, [filteredCalls])

  // Daily trend — bucket calls into the resolved window's day list
  const dailyTrend = useMemo(() => {
    const days = new Map<string, { total: number; missed: number }>()
    resolvedWindow.daysInRange.forEach(d => {
      const key = d.toISOString().split('T')[0]
      days.set(key, { total: 0, missed: 0 })
    })
    filteredCalls.forEach(call => {
      const key = new Date(call.created_at).toISOString().split('T')[0]
      const entry = days.get(key)
      if (entry) {
        entry.total++
        if (call.status === 'missed' || call.status === 'no-answer') entry.missed++
      }
    })
    return Array.from(days.entries()).map(([date, data]) => ({ date, ...data }))
  }, [filteredCalls, resolvedWindow])

  // Peak hours — bucket calls into 24 hours using the tenant timezone
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0)
    filteredCalls.forEach(c => {
      const d = new Date(c.created_at)
      const localHour = parseInt(
        d.toLocaleString('en-US', { timeZone: tenantTimezone, hour: 'numeric', hour12: false }),
        10
      )
      const bucket = Number.isFinite(localHour) ? localHour % 24 : d.getHours()
      hours[bucket] = (hours[bucket] || 0) + 1
    })
    return hours as number[]
  }, [filteredCalls, tenantTimezone])

  const isSingleDayTrend = resolvedWindow.daysInRange.length <= 1

  // Stats
  const stats = useMemo(() => {
    const dayMap = new Map<string, number>()
    filteredCalls.forEach(c => {
      const key = new Date(c.created_at).toLocaleDateString('en-US', { weekday: 'long' })
      dayMap.set(key, (dayMap.get(key) || 0) + 1)
    })
    let busiest = '—', quietest = '—', busiestCount = 0, quietestCount = Infinity
    dayMap.forEach((count, day) => {
      if (count > busiestCount) { busiestCount = count; busiest = day }
      if (count < quietestCount) { quietestCount = count; quietest = day }
    })
    if (quietestCount === Infinity) quietestCount = 0

    const totalDays = new Set(filteredCalls.map(c => new Date(c.created_at).toDateString())).size || 1
    const avgPerDay = Math.round(filteredCalls.length / totalDays)

    const durations = filteredCalls.filter(c => c.duration_seconds && c.duration_seconds > 0).map(c => c.duration_seconds as number)
    const totalDur = safeNum(summary?.total_duration_seconds)
    const longest = durations.length > 0 ? Math.max(...durations) : 0
    const shortest = durations.length > 0 ? Math.min(...durations) : 0

    return { busiest, quietest, avgPerDay, totalDur, longest, shortest }
  }, [filteredCalls, summary])

  const missedCalls = safeNum(summary?.missed_calls)

  const content = (
    <div style={{ maxWidth: 960, padding: isMobile ? '20px 16px 80px' : '36px 40px' }}>
      {/* Title + Date pills */}
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#1E0E00' }}>
          Analytics
        </h1>
        <DateFilterBar
          value={dateFilter}
          onChange={setDateFilter}
          customRange={customRange}
          onCustomRange={setCustomRange}
        />
      </div>

      {loading ? (
        <div className="space-y-5">
          <div className="skeleton bg-white" style={{ height: 260, borderRadius: 20 }} />
          <div className={isMobile ? 'space-y-5' : 'grid grid-cols-2 gap-5'}>
            <div className="skeleton bg-white" style={{ height: 280, borderRadius: 20 }} />
            <div className="skeleton bg-white" style={{ height: 280, borderRadius: 20 }} />
          </div>
        </div>
      ) : (
        <>
          {/* Heatmap */}
          <Card title="When your customers call" style={{ marginBottom: 20 }}>
            <Heatmap data={heatmapData} max={heatmapMax} isMobile={isMobile} />
          </Card>

          {/* Donut + Trend */}
          <div className={isMobile ? 'flex flex-col gap-5' : 'grid grid-cols-2 gap-5'} style={{ marginBottom: 20 }}>
            <Card title="Call Distribution">
              <DonutChart data={donutData} />
            </Card>
            <Card title={`Daily Trend (${resolvedWindow.shortLabel})`}>
              {isSingleDayTrend ? (
                <SingleDayTrendPlaceholder />
              ) : (
                <TrendLine data={dailyTrend} />
              )}
            </Card>
          </div>

          {/* Peak Hours */}
          <Card title={`Peak Hours (${resolvedWindow.shortLabel})`} style={{ marginBottom: 20 }}>
            <PeakHoursChart data={hourlyData} />
          </Card>

          {/* Stats Grid */}
          <div className={isMobile ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-4'}>
            <StatBox label="Busiest Day" value={stats.busiest} />
            <StatBox label="Quietest Day" value={stats.quietest} />
            <StatBox label="Avg Calls/Day" value={String(stats.avgPerDay)} />
            <StatBox label="Total Duration" value={formatDuration(stats.totalDur)} />
            <StatBox label="Longest Call" value={formatDuration(stats.longest)} />
            <StatBox label="Shortest Call" value={formatDuration(stats.shortest)} />
          </div>
        </>
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header variant="dashboard" restaurantName={isAll ? 'All Restaurants' : current.name} connected={connected} isMobile />
        <main className="flex-1">{content}</main>
        <MobileNav missedCount={missedCalls} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="dashboard" restaurantName={isAll ? 'All Restaurants' : current.name} connected={connected} />
      <div className="flex flex-1">
        <Sidebar missedCount={missedCalls} />
        <main className="flex-1 overflow-y-auto">{content}</main>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared Card
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="bg-white" style={{ borderRadius: 20, padding: '24px 28px', border: '1px solid rgba(0,0,0,0.04)', ...style }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1E0E00', marginBottom: 16 }}>{title}</h2>
      {children}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Heatmap (7 × 24)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS_LABELS = ['12a', '', '', '3a', '', '', '6a', '', '', '9a', '', '', '12p', '', '', '3p', '', '', '6p', '', '', '9p', '', '']

function Heatmap({ data, max, isMobile }: { data: number[][]; max: number; isMobile: boolean }) {
  const [tooltip, setTooltip] = useState<{ day: number; hour: number; count: number } | null>(null)
  const cellSize = isMobile ? 12 : 28
  const gap = isMobile ? 2 : 3

  return (
    <div className="relative overflow-x-auto">
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap }}>
        {/* Hour labels */}
        <div style={{ display: 'flex', gap, paddingLeft: isMobile ? 28 : 40 }}>
          {HOURS_LABELS.map((label, i) => (
            <div key={i} style={{ width: cellSize, textAlign: 'center', fontSize: isMobile ? 8 : 10, color: '#B0A090', fontWeight: 500 }}>
              {label}
            </div>
          ))}
        </div>
        {data.map((row, dayIdx) => (
          <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', gap }}>
            <span style={{ width: isMobile ? 24 : 36, fontSize: isMobile ? 10 : 12, color: '#8B7355', fontWeight: 500, textAlign: 'right', paddingRight: 4 }}>
              {DAYS[dayIdx]}
            </span>
            {row.map((count, hourIdx) => {
              const intensity = max > 0 ? count / max : 0
              return (
                <div
                  key={hourIdx}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 6,
                    backgroundColor: count === 0
                      ? 'rgba(0,0,0,0.03)'
                      : `rgba(224,96,42,${Math.max(intensity * 0.9, 0.1)})`,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={() => setTooltip({ day: dayIdx, hour: hourIdx, count })}
                  onMouseLeave={() => setTooltip(null)}
                />
              )
            })}
          </div>
        ))}
      </div>
      {tooltip && !isMobile && (
        <div
          className="absolute z-10 bg-ink text-white"
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            top: 0,
            right: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {DAYS[tooltip.day]} {tooltip.hour === 0 ? '12' : tooltip.hour > 12 ? tooltip.hour - 12 : tooltip.hour}{tooltip.hour >= 12 ? ' PM' : ' AM'} — {tooltip.count} call{tooltip.count !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Donut Chart
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DonutChart({ data }: { data: { completed: number; missed: number; recovered: number; total: number } }) {
  const { completed, missed, recovered, total } = data
  const r = 80
  const stroke = 20
  const c = 2 * Math.PI * r

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ padding: 20 }}>
        <p style={{ fontSize: 14, color: '#8B7355' }}>No call data for this period</p>
      </div>
    )
  }

  const segments = [
    { value: completed, color: '#E0602A', label: 'Completed' },
    { value: recovered, color: '#22C55E', label: 'Recovered' },
    { value: missed, color: '#EF4444', label: 'Missed' },
  ].filter(s => s.value > 0)

  let offset = 0
  const arcs = segments.map(seg => {
    const pct = seg.value / total
    const arc = { ...seg, dasharray: `${pct * c} ${(1 - pct) * c}`, dashoffset: -offset }
    offset += pct * c
    return arc
  })

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: 200, height: 200 }}>
        <svg width="200" height="200" viewBox="0 0 200 200">
          {arcs.map((arc, i) => (
            <circle
              key={i}
              cx="100" cy="100" r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={stroke}
              strokeDasharray={arc.dasharray}
              strokeDashoffset={arc.dashoffset}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span style={{ fontSize: 32, fontWeight: 800, color: '#1E0E00' }}>{total}</span>
          <span style={{ fontSize: 12, color: '#8B7355' }}>total</span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2">
            <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: seg.color }} />
            <span style={{ fontSize: 12, color: '#5C3D22' }}>
              {seg.label} ({seg.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Trend Line (SVG)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SingleDayTrendPlaceholder() {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ padding: '32px 16px', minHeight: 180 }}
    >
      <p style={{ fontSize: 14, color: '#8B7355', maxWidth: 280, lineHeight: 1.4 }}>
        Single day view. See Peak Hours below for the hourly distribution.
      </p>
    </div>
  )
}

function TrendLine({ data }: { data: { date: string; total: number; missed: number }[] }) {
  const w = 400
  const h = 180
  const pad = { top: 10, right: 10, bottom: 30, left: 30 }
  const innerW = w - pad.left - pad.right
  const innerH = h - pad.top - pad.bottom

  const maxVal = Math.max(...data.map(d => d.total), 1)

  const toX = (i: number) => pad.left + (i / (data.length - 1 || 1)) * innerW
  const toY = (v: number) => pad.top + innerH - (v / maxVal) * innerH

  const totalPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.total)}`).join(' ')
  const missedPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.missed)}`).join(' ')

  // X-axis labels (show ~5)
  const xLabels: { i: number; label: string }[] = []
  const step = Math.max(Math.floor(data.length / 5), 1)
  for (let i = 0; i < data.length; i += step) {
    const d = new Date(data[i].date)
    xLabels.push({ i, label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
        <line
          key={pct}
          x1={pad.left} x2={w - pad.right}
          y1={pad.top + innerH * (1 - pct)} y2={pad.top + innerH * (1 - pct)}
          stroke="rgba(0,0,0,0.05)" strokeWidth="1"
        />
      ))}
      {/* Total line */}
      <path d={totalPath} fill="none" stroke="#E0602A" strokeWidth="2" strokeLinejoin="round" />
      {/* Missed dashed line */}
      <path d={missedPath} fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4,3" strokeLinejoin="round" />
      {/* X labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={h - 8} textAnchor="middle" fill="#B0A090" fontSize="10">{label}</text>
      ))}
      {/* Y labels */}
      {[0, Math.round(maxVal / 2), maxVal].map((v, idx) => (
        <text key={idx} x={pad.left - 6} y={toY(v) + 4} textAnchor="end" fill="#B0A090" fontSize="10">{v}</text>
      ))}
      {/* Legend */}
      <circle cx={pad.left + 10} cy={h - 18} r="3" fill="#E0602A" />
      <text x={pad.left + 18} y={h - 15} fill="#5C3D22" fontSize="9">Total</text>
      <circle cx={pad.left + 60} cy={h - 18} r="3" fill="#EF4444" />
      <text x={pad.left + 68} y={h - 15} fill="#5C3D22" fontSize="9">Missed</text>
    </svg>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Peak Hours Bar Chart
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PeakHoursChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1)
  // Find top 3 hours
  const sorted = [...data].sort((a, b) => b - a)
  const top3Threshold = sorted[2] || 0

  const hourLabels = Array.from({ length: 24 }, (_, i) =>
    i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`
  )

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1" style={{ minWidth: 480, height: 140 }}>
        {data.map((count, i) => {
          const barH = max > 0 ? (count / max) * 120 : 2
          const isTop = count >= top3Threshold && count > 0
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                style={{
                  width: '100%',
                  height: Math.max(barH, 2),
                  borderRadius: '4px 4px 0 0',
                  backgroundColor: isTop ? '#E0602A' : `rgba(224,96,42,${Math.max(count / max * 0.5, 0.08)})`,
                  transition: 'height 300ms ease',
                }}
              />
              <span style={{ fontSize: 8, color: '#B0A090', fontWeight: 500 }}>{hourLabels[i]}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Stat Box
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="bg-white"
      style={{ borderRadius: 16, padding: 16, border: '1px solid rgba(0,0,0,0.04)' }}
    >
      <p style={{ fontSize: 12, color: '#8B7355', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color: '#1E0E00', lineHeight: 1 }}>{value}</p>
    </div>
  )
}
