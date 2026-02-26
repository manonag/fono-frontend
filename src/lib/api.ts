import { config } from './config'
import type { CallRecord, DashboardSummary, CallLogFilters, ChartDataPoint, DateFilter } from '@/types'

const baseUrl = config.apiUrl

export async function fetchDashboardSummary(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<DashboardSummary> {
  const params = new URLSearchParams()
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)

  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${baseUrl}/api/v1/dashboard/${tenantId}/summary${qs}`)
  if (!res.ok) throw new Error(`Failed to fetch summary: ${res.status}`)
  return res.json()
}

export async function fetchCallLog(
  tenantId: string,
  filters: CallLogFilters
): Promise<{ calls: CallRecord[]; total: number; page: number }> {
  const params = new URLSearchParams({
    page: filters.page.toString(),
    per_page: filters.perPage.toString(),
  })
  if (filters.status !== 'all') {
    params.set('status', filters.status)
  }

  const res = await fetch(`${baseUrl}/api/v1/dashboard/${tenantId}/calls?${params.toString()}`)
  if (!res.ok) throw new Error(`Failed to fetch calls: ${res.status}`)
  const data = await res.json()

  return {
    calls: data.calls || data.items || data,
    total: data.total || data.count || (Array.isArray(data) ? data.length : 0),
    page: data.page || filters.page,
  }
}

function getDateRange(period: DateFilter): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(today.getTime() + 86400000 - 1)

  switch (period) {
    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 86400000)
      return { start: yesterday, end: new Date(today.getTime() - 1) }
    }
    case 'week': {
      const weekAgo = new Date(today.getTime() - 7 * 86400000)
      return { start: weekAgo, end }
    }
    case 'month': {
      const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
      return { start: monthAgo, end }
    }
    case 'today':
    default:
      return { start: today, end }
  }
}

export async function fetchChartData(
  tenantId: string,
  period: DateFilter
): Promise<ChartDataPoint[]> {
  // Mock: fetch call log and aggregate by hour
  const allCalls: CallRecord[] = []
  let page = 1
  const perPage = 100
  let hasMore = true

  while (hasMore) {
    const result = await fetchCallLog(tenantId, { status: 'all', page, perPage })
    allCalls.push(...result.calls)
    hasMore = result.calls.length === perPage && page < 5 // safety limit
    page++
  }

  const { start, end } = getDateRange(period)

  // Filter calls to the selected period
  const filtered = allCalls.filter((call) => {
    const callDate = new Date(call.created_at)
    return callDate >= start && callDate <= end
  })

  // Group by hour
  const hourMap = new Map<number, ChartDataPoint>()
  for (let h = 0; h < 24; h++) {
    const ampm = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`
    hourMap.set(h, { hour: h, label: ampm, answered: 0, missed: 0, recovered: 0 })
  }

  for (const call of filtered) {
    const hour = new Date(call.created_at).getHours()
    const point = hourMap.get(hour)!
    if (call.status === 'completed') point.answered++
    else if (call.status === 'missed' || call.status === 'no-answer') point.missed++
    else if (call.status === 'recovered') point.recovered++
  }

  // Only return hours that have data or are within business hours (6 AM - 11 PM)
  return Array.from(hourMap.values()).filter(
    (p) => p.hour >= 6 && p.hour <= 23
  )
}
