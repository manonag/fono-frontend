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
import { formatInTimeZone } from 'date-fns-tz'
import {
  HARDCODED_BUSINESS_HOURS,
  bucketHours,
  type BucketedHours,
} from '@/lib/analytics/business-hours'
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
      // Scope the fetch to the selected window server-side, and lift the old
      // page<5 (newest-500) cap that silently truncated the oldest calls for
      // any tenant with >500 calls (Thecha undercount, Jun 12 audit). The
      // window is resolved with the current tenantTimezone; when the tenant's
      // real TZ arrives from peak-hours below it lands in the dep array and
      // this refetches with the corrected boundaries. Durable server-side
      // aggregation is tracked separately as T-320.
      const win = resolveFilterWindow(dateFilter, customRange, tenantTimezone)
      const dateFrom = win.startDate.toISOString()
      const dateTo = win.endDate.toISOString()
      const allCalls: CallRecord[] = []
      let page = 1
      let hasMore = true
      while (hasMore) {
        const fetcher = isAll
          ? fetchCombinedCallLog(allTenantIds, { status: 'all', page, perPage: 100, dateFrom, dateTo }, token)
          : fetchCallLog(tenantId, { status: 'all', page, perPage: 100, dateFrom, dateTo }, token)
        const result = await fetcher
        allCalls.push(...result.calls)
        // Safety ceiling only (5000 in-window calls); date scoping above is
        // what actually bounds the volume now, not the page count.
        hasMore = result.calls.length === 100 && page < 50
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
  }, [tenantId, isAll, allTenantIds, token, dateFilter, customRange, tenantTimezone])

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

  // Heatmap: 7 days x (working hours + 1 collapsed Closed bucket).
  // Day-of-week and hour are bucketed in the tenant's timezone so a
  // restaurant's evening rush lands on the right local day and hour
  // regardless of the viewer's browser TZ. After raw bucketing each row is
  // passed through bucketHours so closed hours collapse into a single
  // right-edge cell.
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0))
    filteredCalls.forEach(call => {
      const d = new Date(call.created_at)
      // ISO day-of-week in tenant TZ: 1=Mon .. 7=Sun -> row 0=Mon .. 6=Sun.
      const isoDay = parseInt(formatInTimeZone(d, tenantTimezone, 'i'), 10)
      const hour = parseInt(formatInTimeZone(d, tenantTimezone, 'H'), 10)
      const row = Number.isFinite(isoDay) ? isoDay - 1 : (d.getDay() === 0 ? 6 : d.getDay() - 1)
      const h = Number.isFinite(hour) ? hour : d.getHours()
      grid[row][h]++
    })
    const rows = grid.map(r => bucketHours(r, HARDCODED_BUSINESS_HOURS))
    const workingHourLabels = bucketHours(Array(24).fill(0), HARDCODED_BUSINESS_HOURS)
      .workingHours.map(w => w.hour)
    return { rows, workingHourLabels }
  }, [filteredCalls, tenantTimezone])

  const heatmapMax = useMemo(() => {
    let m = 1
    for (const row of heatmapData.rows) {
      for (const w of row.workingHours) if (w.count > m) m = w.count
      if (row.closedCount > m) m = row.closedCount
    }
    return m
  }, [heatmapData])

  // Donut chart data. "Missed" includes 'ignored' (calls swept by the
  // end-of-day auto-ignore cron) so the chart reflects the full missed-call
  // surface area, not just rows still pending callback.
  const donutData = useMemo(() => {
    let completed = 0, missed = 0, recovered = 0
    filteredCalls.forEach(c => {
      if (c.status === 'completed') completed++
      else if (c.status === 'missed' || c.status === 'ignored') missed++
      else if (c.status === 'recovered') recovered++
    })
    return { completed, missed, recovered, total: completed + missed + recovered }
  }, [filteredCalls])

  // Daily trend: bucket calls into the resolved window's day list.
  // Both the bucket keys and each call are keyed by their tenant-TZ calendar
  // day (yyyy-MM-dd). The previous code keyed calls by their UTC date
  // (new Date(created_at).toISOString()), which pushed any evening call past
  // the UTC midnight boundary onto the next day's bar in negative-offset TZs.
  const dailyTrend = useMemo(() => {
    const buckets: { date: Date; total: number; missed: number }[] = resolvedWindow.daysInRange.map(d => ({
      date: new Date(d),
      total: 0,
      missed: 0,
    }))
    const dayKey = (d: Date) => formatInTimeZone(d, tenantTimezone, 'yyyy-MM-dd')
    const keyToBucket = new Map<string, { date: Date; total: number; missed: number }>()
    buckets.forEach(b => {
      keyToBucket.set(dayKey(b.date), b)
    })
    filteredCalls.forEach(call => {
      const key = dayKey(new Date(call.created_at))
      const entry = keyToBucket.get(key)
      if (entry) {
        entry.total++
        if (call.status === 'missed' || call.status === 'ignored') entry.missed++
      }
    })
    return buckets
  }, [filteredCalls, resolvedWindow, tenantTimezone])

  // Peak hours: bucket calls into 24 hours using the tenant timezone, then
  // collapse closed hours into a single right-edge bucket via the shared
  // bucketHours helper. Working hours stay at 1-hour granularity.
  const hourlyBuckets = useMemo<BucketedHours>(() => {
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
    return bucketHours(hours, HARDCODED_BUSINESS_HOURS)
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
            <PeakHoursChart data={hourlyBuckets} />
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

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

function formatHourLabelShort(hour: number): string {
  if (hour === 0) return '12a'
  if (hour === 12) return '12p'
  return hour < 12 ? `${hour}a` : `${hour - 12}p`
}

// Visual treatment shared by the Closed cell on the heatmap and the Closed
// bar on the Peak Hours chart. Dashed outline drawn inside the cell so it
// does not change layout footprint.
const CLOSED_OUTLINE: React.CSSProperties = {
  outline: '1px dashed rgba(0,0,0,0.28)',
  outlineOffset: -1,
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

type HeatmapData = {
  rows: BucketedHours[]
  workingHourLabels: number[]
}

function Heatmap({ data, max, isMobile }: { data: HeatmapData; max: number; isMobile: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null)
  const cellSize = isMobile ? 14 : 28
  const gap = isMobile ? 2 : 3

  // Working-hour labels show every hour on desktop and every 3rd hour on
  // mobile so they do not collide at 14px cell width. The Closed column
  // header always renders.
  const labels = data.workingHourLabels.map((hour, i) => {
    if (isMobile && i % 3 !== 0) return ''
    return formatHourLabelShort(hour)
  })

  const showWorking = (
    e: React.SyntheticEvent<Element>,
    dayIdx: number,
    hour: number,
    count: number,
  ) => {
    if (count <= 0) return
    const pos = positionTooltip(e.currentTarget, containerRef.current)
    if (!pos) return
    setTooltip({
      ...pos,
      content: `${DAYS[dayIdx]} ${formatHourLabel(hour)}: ${count} call${count !== 1 ? 's' : ''}`,
    })
  }

  const showClosed = (
    e: React.SyntheticEvent<Element>,
    dayIdx: number,
    count: number,
  ) => {
    const pos = positionTooltip(e.currentTarget, containerRef.current)
    if (!pos) return
    setTooltip({
      ...pos,
      content: `${DAYS[dayIdx]} closed hours: ${count} call${count !== 1 ? 's' : ''}`,
    })
  }

  return (
    <div ref={containerRef} className="relative overflow-x-auto">
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap }}>
        {/* Hour labels + Closed header */}
        <div style={{ display: 'flex', gap, paddingLeft: isMobile ? 28 : 40 }}>
          {labels.map((label, i) => (
            <div
              key={i}
              style={{
                width: cellSize,
                textAlign: 'center',
                fontSize: isMobile ? 8 : 10,
                color: '#B0A090',
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          ))}
          <div
            style={{
              width: cellSize,
              textAlign: 'center',
              fontSize: isMobile ? 8 : 10,
              color: '#8B7355',
              fontWeight: 600,
            }}
          >
            Closed
          </div>
        </div>
        {data.rows.map((row, dayIdx) => (
          <div key={dayIdx} style={{ display: 'flex', alignItems: 'center', gap }}>
            <span
              style={{
                width: isMobile ? 24 : 36,
                fontSize: isMobile ? 10 : 12,
                color: '#8B7355',
                fontWeight: 500,
                textAlign: 'right',
                paddingRight: 4,
              }}
            >
              {DAYS[dayIdx]}
            </span>
            {row.workingHours.map(({ hour, count }) => {
              const intensity = max > 0 ? count / max : 0
              const hasCalls = count > 0
              return (
                <div
                  key={hour}
                  role="img"
                  aria-label={`${DAYS[dayIdx]} ${formatHourLabel(hour)}, ${count} call${count !== 1 ? 's' : ''}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 6,
                    backgroundColor: !hasCalls
                      ? 'rgba(0,0,0,0.03)'
                      : `rgba(224,96,42,${Math.max(intensity * 0.9, 0.1)})`,
                    cursor: hasCalls ? 'pointer' : 'default',
                  }}
                  onMouseEnter={(e) => showWorking(e, dayIdx, hour, count)}
                  onMouseLeave={() => setTooltip(null)}
                  onTouchStart={(e) => showWorking(e, dayIdx, hour, count)}
                />
              )
            })}
            {(() => {
              const count = row.closedCount
              const intensity = max > 0 ? count / max : 0
              const hasCalls = count > 0
              return (
                <div
                  key="closed"
                  role="img"
                  aria-label={`${DAYS[dayIdx]} closed hours, ${count} call${count !== 1 ? 's' : ''}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 6,
                    backgroundColor: !hasCalls
                      ? 'rgba(0,0,0,0.02)'
                      : `rgba(224,96,42,${Math.max(intensity * 0.9, 0.1)})`,
                    cursor: 'pointer',
                    ...CLOSED_OUTLINE,
                  }}
                  onMouseEnter={(e) => showClosed(e, dayIdx, count)}
                  onMouseLeave={() => setTooltip(null)}
                  onTouchStart={(e) => showClosed(e, dayIdx, count)}
                />
              )
            })()}
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

function PeakHoursChart({ data }: { data: BucketedHours }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<ChartTooltipState | null>(null)

  const workingCounts = data.workingHours.map(w => w.count)
  const max = Math.max(...workingCounts, data.closedCount, 1)
  const totalInWindow = workingCounts.reduce((acc, n) => acc + n, 0) + data.closedCount

  // Top-3 highlight applies to working hours only. The closed bar is the
  // catch-all for hours the restaurant is shut, so highlighting it as a
  // "peak hour" would mislead the reader.
  const sortedWorking = [...workingCounts].sort((a, b) => b - a)
  const top3Threshold = sortedWorking[2] || 0

  const showWorking = (
    e: React.SyntheticEvent<HTMLDivElement>,
    hour: number,
    count: number,
  ) => {
    const pos = positionTooltip(e.currentTarget, containerRef.current)
    if (!pos) return
    const pctStr = totalInWindow > 0 ? `${((count / totalInWindow) * 100).toFixed(0)}%` : '0%'
    setTooltip({
      ...pos,
      content: `${formatHourLabel(hour)}: ${count} call${count !== 1 ? 's' : ''} (${pctStr} of window)`,
    })
  }

  const showClosed = (
    e: React.SyntheticEvent<HTMLDivElement>,
    count: number,
  ) => {
    const pos = positionTooltip(e.currentTarget, containerRef.current)
    if (!pos) return
    setTooltip({
      ...pos,
      content: `Closed hours: ${count} call${count !== 1 ? 's' : ''}`,
    })
  }

  const barHeight = (count: number) => Math.max(max > 0 ? (count / max) * 120 : 2, 2)

  return (
    <div ref={containerRef} className="relative overflow-x-auto">
      <div className="flex items-end gap-1" style={{ minWidth: 480, height: 140 }}>
        {data.workingHours.map(({ hour, count }) => {
          const isTop = count >= top3Threshold && count > 0
          return (
            <div key={hour} className="flex-1 flex flex-col items-center gap-1">
              <div
                role="img"
                aria-label={`${formatHourLabel(hour)}, ${count} call${count !== 1 ? 's' : ''}`}
                style={{
                  width: '100%',
                  height: barHeight(count),
                  borderRadius: '4px 4px 0 0',
                  backgroundColor: isTop
                    ? '#E0602A'
                    : `rgba(224,96,42,${Math.max((count / max) * 0.5, 0.08)})`,
                  transition: 'height 300ms ease',
                  cursor: count > 0 ? 'pointer' : 'default',
                }}
                onMouseEnter={(e) => showWorking(e, hour, count)}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={(e) => showWorking(e, hour, count)}
              />
              <span style={{ fontSize: 8, color: '#B0A090', fontWeight: 500 }}>
                {formatHourLabelShort(hour)}
              </span>
            </div>
          )
        })}
        {/* Closed bucket: same color scale as working bars, with a dashed
            outline so the reader can tell it is the all-closed-hours
            catch-all rather than a peak hour. */}
        <div key="closed" className="flex-1 flex flex-col items-center gap-1">
          <div
            role="img"
            aria-label={`Closed hours, ${data.closedCount} call${data.closedCount !== 1 ? 's' : ''}`}
            style={{
              width: '100%',
              height: barHeight(data.closedCount),
              borderRadius: '4px 4px 0 0',
              backgroundColor: `rgba(224,96,42,${Math.max((data.closedCount / max) * 0.5, 0.08)})`,
              transition: 'height 300ms ease',
              cursor: 'pointer',
              ...CLOSED_OUTLINE,
            }}
            onMouseEnter={(e) => showClosed(e, data.closedCount)}
            onMouseLeave={() => setTooltip(null)}
            onTouchStart={(e) => showClosed(e, data.closedCount)}
          />
          <span style={{ fontSize: 8, color: '#8B7355', fontWeight: 600 }}>Closed</span>
        </div>
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
