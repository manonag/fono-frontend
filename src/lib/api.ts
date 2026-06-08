import { config } from './config'
import type {
  CallRecord,
  DashboardSummary,
  CallLogFilters,
  ChartDataPoint,
  AnalyticsSummary,
  PeakHoursResponse,
} from '@/types'
// DEV ONLY: dev fixtures for the voicemail-route kiosk. Removed once the
// voicemail backend endpoints ship (see the voicemail kiosk section below).
import { mockTenant, mockVoicemails } from '@/components/kiosk/voicemail/mockData'
import type {
  IntentKey,
  Status,
  Tenant,
  Voicemail,
} from '@/components/kiosk/voicemail/types'

const baseUrl = config.apiUrl

function authHeaders(token?: string): HeadersInit {
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

/**
 * Window params for the summary / stats endpoints. Prefer `dateFrom`/
 * `dateTo` (ISO UTC instants, tenant-TZ-resolved). `days` is accepted for
 * back-compat with surfaces that haven't migrated yet; the backend ignores
 * `days` when `dateFrom` is set.
 */
export interface SummaryWindow {
  dateFrom?: string
  dateTo?: string
  days?: number
}

function appendWindowParams(params: URLSearchParams, w: SummaryWindow | undefined): void {
  if (!w) return
  if (w.dateFrom) params.set('date_from', w.dateFrom)
  if (w.dateTo) params.set('date_to', w.dateTo)
  if (w.days && !w.dateFrom) params.set('days', String(w.days))
}

export async function fetchDashboardSummary(
  tenantId: string,
  window?: SummaryWindow,
  token?: string,
): Promise<DashboardSummary> {
  const params = new URLSearchParams()
  appendWindowParams(params, window)
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

/**
 * All-Restaurants aggregation: applies a single window to every tenant and
 * sums the results. When a portfolio spans timezones there is no single
 * correct calendar day, so callers should resolve the window in the admin
 * viewer's browser TZ (or whichever pragmatic anchor they prefer) before
 * passing it here. Single-tenant views should always resolve in the
 * tenant's own TZ via useRestaurant().current.timezone.
 */
export async function fetchCombinedSummary(
  tenantIds: string[],
  window?: SummaryWindow,
  token?: string,
): Promise<DashboardSummary> {
  const results = await Promise.all(tenantIds.map(id => fetchDashboardSummary(id, window, token)))
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

export interface TenantStats {
  total_calls: number
  completed_calls: number
  missed_calls: number
  avg_duration_seconds: number
  sla_breach_count: number
  recovery_rate: number
  calls_today: number
  calls_this_week: number
}

export async function fetchTenantStats(
  tenantId: string,
  window?: SummaryWindow,
  token?: string,
): Promise<TenantStats> {
  const params = new URLSearchParams()
  appendWindowParams(params, window)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${baseUrl}/api/v1/tenants/${tenantId}/stats${qs}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`Failed to fetch tenant stats: ${res.status}`)
  return res.json()
}

export async function fetchCombinedStats(
  tenantIds: string[],
  window?: SummaryWindow,
  token?: string,
): Promise<TenantStats> {
  const results = await Promise.all(tenantIds.map(id => fetchTenantStats(id, window, token)))
  const totalMissed = results.reduce((s, r) => s + r.missed_calls, 0)
  const totalRecoveredWeighted = results.reduce((s, r) => s + (r.recovery_rate * r.missed_calls / 100), 0)
  return {
    total_calls: results.reduce((s, r) => s + r.total_calls, 0),
    completed_calls: results.reduce((s, r) => s + r.completed_calls, 0),
    missed_calls: totalMissed,
    avg_duration_seconds: results.length > 0
      ? results.reduce((s, r) => s + r.avg_duration_seconds, 0) / results.length
      : 0,
    sla_breach_count: results.reduce((s, r) => s + r.sla_breach_count, 0),
    recovery_rate: totalMissed > 0 ? Math.round((totalRecoveredWeighted / totalMissed) * 100) : 100,
    calls_today: results.reduce((s, r) => s + r.calls_today, 0),
    calls_this_week: results.reduce((s, r) => s + r.calls_this_week, 0),
  }
}

/**
 * Mini-chart data for the dashboard cards. Pulls the full call log
 * already-scoped to the window (server-side filter), then buckets by
 * hour-of-day. Caller passes `dateFrom`/`dateTo` resolved in the tenant's
 * TZ — see analytics-filter.ts.
 *
 * Ignored calls are counted as missed here (sprint c630d5f1 A3): a call
 * that was missed and then dismissed by the operator is still a missed
 * call for the purpose of "how busy was this hour."
 */
export async function fetchChartData(
  tenantId: string,
  window: { dateFrom: string; dateTo: string },
  token?: string,
): Promise<ChartDataPoint[]> {
  const allCalls: CallRecord[] = []
  let page = 1
  const perPage = 100
  let hasMore = true

  while (hasMore) {
    const result = await fetchCallLog(
      tenantId,
      { status: 'all', page, perPage, dateFrom: window.dateFrom, dateTo: window.dateTo },
      token,
    )
    allCalls.push(...result.calls)
    hasMore = result.calls.length === perPage && page < 5
    page++
  }

  const hourMap = new Map<number, ChartDataPoint>()
  for (let h = 0; h < 24; h++) {
    const ampm = h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`
    hourMap.set(h, { hour: h, label: ampm, answered: 0, missed: 0, recovered: 0 })
  }

  for (const call of allCalls) {
    const hour = new Date(call.created_at).getHours()
    const point = hourMap.get(hour)!
    if (call.status === 'completed') point.answered++
    else if (call.status === 'missed' || call.status === 'ignored') point.missed++
    else if (call.status === 'recovered') point.recovered++
  }

  return Array.from(hourMap.values()).filter(
    (p) => p.hour >= 6 && p.hour <= 23
  )
}

// ---------------------------------------------------------------------------
// Voicemail-route kiosk
//
// DEV ONLY scaffolding. The voicemail-route backend endpoints do not exist
// yet:
//   GET   /api/v1/tenants/:id              -> routing_mode + categories
//   GET   /api/v1/tenants/:id/voicemails   -> voicemail list
//   PATCH /api/v1/voicemails/:id/status    -> { status, reason? }
//   PATCH /api/v1/voicemails/:id/intent    -> { intent_category_key }
//
// Each function attempts the real endpoint (production data-flow shape) and
// falls back to the dev fixtures in
// src/components/kiosk/voicemail/mockData.ts. When the backend ships:
//   - delete the mockTenant / mockVoicemails fallbacks and the import above
//   - change patchVoicemail* to throw on a non-ok / failed response, so the
//     optimistic-rollback + toast path already wired in KioskPage activates
// Tracked in the feature PR description.
// ---------------------------------------------------------------------------

function isTenantConfig(value: unknown): value is Tenant {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.routing_mode === 'string' &&
    Array.isArray(v.categories)
  )
}

/**
 * Tenant config for the kiosk route branch: routing_mode + per-tenant
 * category display names. Falls back to the dev fixture, keeping the real
 * id / name from the session or impersonation context.
 */
export async function fetchTenantVoicemailConfig(
  tenantId: string,
  tenantName: string,
  token?: string,
): Promise<Tenant> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/tenants/${tenantId}`, {
      headers: authHeaders(token),
    })
    if (res.ok) {
      const data: unknown = await res.json()
      if (isTenantConfig(data)) return data
    }
  } catch {
    // fall through to the dev fixture
  }
  return {
    ...mockTenant,
    id: tenantId || mockTenant.id,
    name: tenantName || mockTenant.name,
  }
}

/** Voicemail list for a tenant. Falls back to the dev fixtures. */
export async function fetchVoicemails(
  tenantId: string,
  token?: string,
): Promise<Voicemail[]> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/tenants/${tenantId}/voicemails`, {
      headers: authHeaders(token),
    })
    if (res.ok) {
      const data: unknown = await res.json()
      if (Array.isArray(data)) return data as Voicemail[]
      const wrapped = data as { voicemails?: unknown }
      if (wrapped && Array.isArray(wrapped.voicemails)) {
        return wrapped.voicemails as Voicemail[]
      }
    }
  } catch {
    // fall through to the dev fixtures
  }
  return mockVoicemails
}

/**
 * Persist a voicemail status change (T-304 slice b backend). Throws on a
 * network error or non-2xx so the caller rolls back its optimistic update.
 */
export async function patchVoicemailStatus(
  id: string,
  status: Status,
  token?: string,
  reason?: string,
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/v1/voicemails/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(reason ? { status, reason } : { status }),
  })
  if (!res.ok) throw new Error(`patchVoicemailStatus failed: ${res.status}`)
}

/**
 * Persist a voicemail intent reclassification (T-304 slice c backend). Throws
 * on failure so the caller rolls back its optimistic update.
 */
export async function patchVoicemailIntent(
  id: string,
  intentCategoryKey: IntentKey,
  token?: string,
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/v1/voicemails/${id}/intent`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ intent_category_key: intentCategoryKey }),
  })
  if (!res.ok) throw new Error(`patchVoicemailIntent failed: ${res.status}`)
}
