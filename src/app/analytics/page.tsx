'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { UserMenu } from '@/components/user-menu'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useCallEvents } from '@/hooks/use-call-events'
import { fetchDashboardSummary, fetchCallLog, fetchPeakHours, fetchCombinedSummary, fetchCombinedCallLog } from '@/lib/api'
import { useRestaurant } from '@/lib/restaurant-context'
import { useFonoToken } from '@/hooks/use-fono-token'
import { DateFilterBar } from '@/components/date-filter'
import { resolveFilterWindow } from '@/lib/analytics-filter'
import { ChartTooltip, type ChartTooltipState } from '@/components/chart-tooltip'
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

  // Donut chart data. "Missed" includes 'ignored' (calls swept by the
  // end-of-day auto-ignore cron) so the chart reflects the full missed-call
  // surface area, not just rows still pending callback.
  const donutData = useMemo(() => {
    let completed = 0, missed = 0, recovered = 0
    filteredCalls.forEach(c => {
      if (c.status === 'completed') completed++
      else if (c.status === 'missed' || c.status === 'no-answer' || c.status === 'ignored') missed++
      else if (c.status === 'recovered') recovered++
    })
    return { completed, missed, recovered, total: completed + missed + recovered }
  }, [filteredCalls])

  // Daily trend: bucket calls into the resolved window's day list.
  // Carries the Date object through so the X-axis label formatter renders
  // tenant-local dates (parsing "YYYY-MM-DD" via new Date() yields UTC
  // midnight, which prints as the previous day in negative-offset TZs).
  const dailyTrend = useMemo(() => {
    const buckets: { date: Date; total: number; missed: number }[] = resolvedWindow.daysInRange.map(d => ({
      date: new Date(d),
      total: 0,
      missed: 0,
    }))
    const keyToBucket = new Map<string, { date: Date; total: number; missed: number }>()
    buckets.forEach(b => {
      keyToBucket.set(b.date.toISOString().split('T')[0], b)
    })
    filteredCalls.forEach(call => {
      const key = new Date(call.created_at).toISOString().split('T')[0]
      const entry = keyToBucket.get(key)
      if (entry) {
        entry.total++
        if (call.status === 'missed' || call.status === 'no-answer' || call.status === 'ignored') entry.missed++
      }
    })
    return buckets
  }, [filteredCalls, resolvedWindow])

  // Peak hours: bucket calls into 24 hours using the tenant timezone
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
      <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 8 }}>
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

      {/* Resolved date range subtitle */}
      <p
        className="text-sm"
        style={{ color: '#8B7355', marginBottom: 20, fontWeight: 500 }}
      >
        {resolvedWindow.label}
      </p>

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

          {/* Donut + Trend side-by-side on tablet/desktop, stacked on mobile.
              Default grid stretch matches the two card heights so the donut
              card's legend sits inside its own card boundary, separated from
              the trend's X-axis row by gap-5. Donut Card uses flex-column so
              the SVG can grow into any extra vertical room.
              Kiosk banner moves below the row at full width when missed > 0. */}
          <div className="flex flex-col gap-5" style={{ marginBottom: 20 }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Card title="Call Distribution" style={{ display: 'flex', flexDirection: 'column' }}>
                <DonutChart data={donutData} />
              </Card>
              <Card title={`Daily Trend (${resolvedWindow.shortLabel})`}>
                {isSingleDayTrend ? (
                  <SingleDayTrendPlaceholder />
                ) : (
                  <TrendLine data={dailyTrend} timezone={tenantTimezone} />
                )}
              </Card>
            </div>
            {donutData.missed > 0 && (
              <Card title="Here's how the kiosk helps">
                <p style={{ fontSize: 14, color: '#5C3D22', lineHeight: 1.6 }}>
                  When you miss a customer&apos;s call, the kiosk shows it as a missed-call card with their number and an SLA timer. One tap calls them back. Calls you recover this way show up as recovered orders in your reports.
                </p>
              </Card>
            )}
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
        <Header variant="dashboard" restaurantName={isAll ? 'All Restaurants' : current.name} connected={connected} isMobile userMenu={<UserMenu />} />
        <main className="flex-1">{content}</main>
        <MobileNav missedCount={missedCalls} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="dashboard" restaurantName={isAll ? 'All Restaurants' : current.name} connected={connected} userMenu={<UserMenu />} />
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

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

function positionTooltip(target: Element, container: HTMLElement | null): { x: number; y: number } | null {
  if (!container) return null
  const targetRect = target.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return {
    x: targetRect.left + targetRect.width / 2 - containerRect.left,
    y: targetRect.top - containerRect.top,
  }
}

function Heatmap({ data, max, isMobile }: { data: number[][]; max: number; isMobile: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null)
  const cellSize = isMobile ? 12 : 28
  const gap = isMobile ? 2 : 3

  const showCell = (e: React.SyntheticEvent<Element>, dayIdx: number, hourIdx: number, count: number) => {
    if (count <= 0) return
    const pos = positionTooltip(e.currentTarget, containerRef.current)
    if (!pos) return
    setTooltip({
      ...pos,
      content: `${DAYS[dayIdx]} ${formatHourLabel(hourIdx)}: ${count} call${count !== 1 ? 's' : ''}`,
    })
  }

  return (
    <div ref={containerRef} className="relative overflow-x-auto">
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
              const hasCalls = count > 0
              return (
                <div
                  key={hourIdx}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 6,
                    backgroundColor: !hasCalls
                      ? 'rgba(0,0,0,0.03)'
                      : `rgba(224,96,42,${Math.max(intensity * 0.9, 0.1)})`,
                    cursor: hasCalls ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => showCell(e, dayIdx, hourIdx, count)}
                  onMouseLeave={() => setTooltip(null)}
                  onTouchStart={(e) => showCell(e, dayIdx, hourIdx, count)}
                />
              )
            })}
          </div>
        ))}
      </div>
      <ChartTooltip state={tooltip} />
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Donut Chart
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DonutChart({ data }: { data: { completed: number; missed: number; recovered: number; total: number } }) {
  const { completed, missed, recovered, total } = data
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null)
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
    { value: missed, color: '#DC2626', label: 'Missed' },
  ].filter(s => s.value > 0)

  let offset = 0
  const arcs = segments.map(seg => {
    const pct = seg.value / total
    const arc = { ...seg, pct, dasharray: `${pct * c} ${(1 - pct) * c}`, dashoffset: -offset }
    offset += pct * c
    return arc
  })

  // Donut arcs all share the same SVG bounding box, so positionTooltip would
  // place every tooltip at the donut center. Use cursor position instead.
  const showSegment = (
    e: React.MouseEvent<SVGCircleElement> | React.TouchEvent<SVGCircleElement>,
    arc: { label: string; value: number; pct: number }
  ) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const point = 'touches' in e ? e.touches[0] : e
    if (!point) return
    const pctStr = (arc.pct * 100).toFixed(1)
    setTooltip({
      x: point.clientX - rect.left,
      y: point.clientY - rect.top,
      content: `${arc.label}: ${arc.value} (${pctStr}%)`,
    })
  }

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-4 flex-1 min-h-0">
      <div className="flex-1 w-full flex items-center justify-center" style={{ minHeight: 200 }}>
        <div className="relative" style={{ width: '100%', maxWidth: 280, aspectRatio: '1 / 1' }}>
          <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', display: 'block' }}>
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
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => showSegment(e, arc)}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={(e) => showSegment(e, arc)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span style={{ fontSize: 32, fontWeight: 800, color: '#1E0E00' }}>{total}</span>
            <span style={{ fontSize: 12, color: '#8B7355' }}>total</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 w-full">
        {segments.map(seg => (
          <div key={seg.label} className="flex items-center gap-2">
            <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: seg.color }} />
            <span style={{ fontSize: 12, color: '#5C3D22' }}>
              {seg.label} ({seg.value})
            </span>
          </div>
        ))}
      </div>
      <ChartTooltip state={tooltip} />
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

function TrendLine({ data, timezone }: { data: { date: Date; total: number; missed: number }[]; timezone: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null)
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

  const fmtDay = (d: Date) =>
    d.toLocaleDateString('en-US', { timeZone: timezone, month: 'short', day: 'numeric' })

  // X-axis labels (show ~5)
  const xLabels: { i: number; label: string }[] = []
  const step = Math.max(Math.floor(data.length / 5), 1)
  for (let i = 0; i < data.length; i += step) {
    xLabels.push({ i, label: fmtDay(data[i].date) })
  }

  const showPoint = (e: React.SyntheticEvent<SVGCircleElement>, d: { date: Date; total: number; missed: number }) => {
    const pos = positionTooltip(e.currentTarget, containerRef.current)
    if (!pos) return
    setTooltip({
      ...pos,
      content: `${fmtDay(d.date)}: ${d.total} total, ${d.missed} missed`,
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-1"
        style={{ marginBottom: 8, fontSize: 12, color: '#5C3D22' }}
      >
        <span className="inline-flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#E0602A', display: 'inline-block' }} />
          Total
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#DC2626', display: 'inline-block' }} />
          Missed
        </span>
      </div>
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
        {/* Total (solid) and Missed (dashed) series. Visible dots at each
            data point so zero-value days read as on-the-axis dots instead
            of being interpolated through by the connecting line. */}
        <path d={totalPath} fill="none" stroke="#E0602A" strokeWidth="2" strokeLinejoin="round" />
        <path d={missedPath} fill="none" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="4,3" strokeLinejoin="round" />
        {/* Total dots: visible 2.5px marker + 10px invisible hit zone */}
        {data.map((d, i) => (
          <g key={`t-${i}`}>
            <circle
              cx={toX(i)} cy={toY(d.total)} r="2.5"
              fill="#E0602A"
            />
            <circle
              cx={toX(i)} cy={toY(d.total)} r="10"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => showPoint(e, d)}
              onMouseLeave={() => setTooltip(null)}
              onTouchStart={(e) => showPoint(e, d)}
            />
          </g>
        ))}
        {/* Missed dots: visible 2.5px marker + 10px invisible hit zone.
            Zero-value dots sit on the X-axis to anchor the eye away from
            the dashed line's geometric interpolation. */}
        {data.map((d, i) => (
          <g key={`m-${i}`}>
            <circle
              cx={toX(i)} cy={toY(d.missed)} r="2.5"
              fill="#DC2626"
            />
            <circle
              cx={toX(i)} cy={toY(d.missed)} r="10"
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => showPoint(e, d)}
              onMouseLeave={() => setTooltip(null)}
              onTouchStart={(e) => showPoint(e, d)}
            />
          </g>
        ))}
        {/* X labels */}
        {xLabels.map(({ i, label }) => (
          <text key={i} x={toX(i)} y={h - 8} textAnchor="middle" fill="#B0A090" fontSize="10">{label}</text>
        ))}
        {/* Y labels */}
        {[0, Math.round(maxVal / 2), maxVal].map((v, idx) => (
          <text key={idx} x={pad.left - 6} y={toY(v) + 4} textAnchor="end" fill="#B0A090" fontSize="10">{v}</text>
        ))}
        {/* In-SVG legend removed; series legend now renders as a DOM row
            above the chart to avoid colliding with the X-axis date labels. */}
      </svg>
      <ChartTooltip state={tooltip} />
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Peak Hours Bar Chart
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PeakHoursChart({ data }: { data: number[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null)
  const max = Math.max(...data, 1)
  const totalInWindow = data.reduce((acc, n) => acc + n, 0)
  // Find top 3 hours
  const sorted = [...data].sort((a, b) => b - a)
  const top3Threshold = sorted[2] || 0

  const hourLabels = Array.from({ length: 24 }, (_, i) =>
    i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`
  )

  const showBar = (e: React.SyntheticEvent<HTMLDivElement>, hour: number, count: number) => {
    const pos = positionTooltip(e.currentTarget, containerRef.current)
    if (!pos) return
    const pctStr = totalInWindow > 0 ? `${((count / totalInWindow) * 100).toFixed(0)}%` : '0%'
    setTooltip({
      ...pos,
      content: `${formatHourLabel(hour)}: ${count} call${count !== 1 ? 's' : ''} (${pctStr} of window)`,
    })
  }

  return (
    <div ref={containerRef} className="relative overflow-x-auto">
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
                  cursor: count > 0 ? 'pointer' : 'default',
                }}
                onMouseEnter={(e) => showBar(e, i, count)}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={(e) => showBar(e, i, count)}
              />
              <span style={{ fontSize: 8, color: '#B0A090', fontWeight: 500 }}>{hourLabels[i]}</span>
            </div>
          )
        })}
      </div>
      <ChartTooltip state={tooltip} />
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
