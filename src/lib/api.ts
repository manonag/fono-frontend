import { config } from './config'
import type {
  CallRecord,
  DashboardSummary,
  CallLogFilters,
  ChartDataPoint,
  DateFilter,
  AnalyticsSummary,
  PeakHoursResponse,
} from '@/types'

const baseUrl = config.apiUrl

function authHeaders(token?: string): HeadersInit {
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function fetchDashboardSummary(
  tenantId: string,
  days?: number,
  token?: string
): Promise<DashboardSummary> {
  const params = new URLSearchParams()
  if (days) params.set('days', days.toString())

  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${baseUrl}/api/v1/dashboard/${tenantId}/summary${qs}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`Failed to fetch summary: ${res.status}`)
  return res.json()
}

export async function fetchCallLog(
  tenantId: string,
  filters: CallLogFilters,
  token?: string
): Promise<{ calls: CallRecord[]; total: number; page: number; totalPages: number }> {
  const params = new URLSearchParams({
    page: filters.page.toString(),
    per_page: filters.perPage.toString(),
  })
  if (filters.status !== 'all') {
    params.set('status', filters.status)
  }
  if (filters.caller) {
    params.set('caller', filters.caller)
  }
  if (filters.dateFrom) {
    params.set('date_from', filters.dateFrom)
  }
  if (filters.dateTo) {
    params.set('date_to', filters.dateTo)
  }

  const res = await fetch(`${baseUrl}/api/v1/dashboard/${tenantId}/calls?${params.toString()}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`Failed to fetch calls: ${res.status}`)
  const data = await res.json()

  return {
    calls: data.calls || [],
    total: data.total || 0,
    page: data.page || filters.page,
    totalPages: data.total_pages || 1,
  }
}

export async function fetchAnalyticsSummary(
  tenantId: string,
  days: number = 7,
  token?: string
): Promise<AnalyticsSummary> {
  const res = await fetch(`${baseUrl}/analytics/${tenantId}/summary?days=${days}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`Failed to fetch analytics summary: ${res.status}`)
  return res.json()
}

export async function fetchPeakHours(
  tenantId: string,
  days: number = 30,
  token?: string
): Promise<PeakHoursResponse> {
  const res = await fetch(`${baseUrl}/analytics/${tenantId}/peak-hours?days=${days}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`Failed to fetch peak hours: ${res.status}`)
  return res.json()
}

export async function fetchCombinedSummary(
  tenantIds: string[],
  days?: number,
  token?: string
): Promise<DashboardSummary> {
  const results = await Promise.all(tenantIds.map(id => fetchDashboardSummary(id, days, token)))
  return {
    total_calls: results.reduce((s, r) => s + (r.total_calls || 0), 0),
    missed_calls: results.reduce((s, r) => s + (r.missed_calls || 0), 0),
    answered_calls: results.reduce((s, r) => s + (r.answered_calls || 0), 0),
    total_duration_seconds: results.reduce((s, r) => s + (r.total_duration_seconds || 0), 0),
    total_recordings: results.reduce((s, r) => s + (r.total_recordings || 0), 0),
    period: results[0]?.period || 'combined',
  }
}

export async function fetchCombinedCallLog(
  tenantIds: string[],
  filters: CallLogFilters,
  token?: string
): Promise<{ calls: CallRecord[]; total: number; page: number; totalPages: number }> {
  const results = await Promise.all(tenantIds.map(id => fetchCallLog(id, filters, token)))
  const allCalls = results.flatMap(r => r.calls).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  return {
    calls: allCalls,
    total: results.reduce((s, r) => s + r.total, 0),
    page: filters.page,
    totalPages: Math.max(...results.map(r => r.totalPages)),
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
  period: DateFilter,
  token?: string
): Promise<ChartDataPoint[]> {
  const allCalls: CallRecord[] = []
  let page = 1
  const perPage = 100
  let hasMore = true

  while (hasMore) {
    const result = await fetchCallLog(tenantId, { status: 'all', page, perPage }, token)
    allCalls.push(...result.calls)
    hasMore = result.calls.length === perPage && page < 5
    page++
  }

  const { start, end } = getDateRange(period)

  const filtered = allCalls.filter((call) => {
    const callDate = new Date(call.created_at)
    return callDate >= start && callDate <= end
  })

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

  return Array.from(hourMap.values()).filter(
    (p) => p.hour >= 6 && p.hour <= 23
  )
}
