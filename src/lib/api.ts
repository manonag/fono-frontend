import { config } from './config'
import type {
  CallFallbackRule,
  CallRecord,
  DashboardSummary,
  CallLogFilters,
  ChartDataPoint,
  AnalyticsSummary,
  PeakHoursResponse,
} from '@/types'
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
// Call routing fallback rules (T-249 Slice 1 backend, Slice 3 UI)
//
// Tenant-scoped CRUD for the staff-no-answer fallback cascade. The mutating
// helpers throw an Error carrying the backend `detail` message (E.164 / loop
// guard / duplicate / 3-per-window cap), so the card can surface the exact
// reason and roll back its optimistic update.
// ---------------------------------------------------------------------------

export interface CallFallbackRuleInput {
  phone_number: string
  days_of_week: number
  window_start: string
  window_end: string
  label?: string | null
  cascade_order?: number
}

async function readDetail(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null)
  const detail = body && (body as { detail?: unknown }).detail
  return typeof detail === 'string' && detail ? detail : fallback
}

export async function fetchCallFallbackRules(
  tenantId: string,
  token?: string,
): Promise<CallFallbackRule[]> {
  const res = await fetch(`${baseUrl}/api/v1/tenants/${tenantId}/call-fallback-rules`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(`Failed to fetch fallback rules: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data?.rules) ? (data.rules as CallFallbackRule[]) : []
}

export async function createCallFallbackRule(
  tenantId: string,
  input: CallFallbackRuleInput,
  token?: string,
): Promise<CallFallbackRule> {
  const res = await fetch(`${baseUrl}/api/v1/tenants/${tenantId}/call-fallback-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await readDetail(res, 'Could not add the fallback number.'))
  return res.json()
}

export async function patchCallFallbackRule(
  ruleId: string,
  updates: Partial<CallFallbackRuleInput>,
  token?: string,
): Promise<CallFallbackRule> {
  const res = await fetch(`${baseUrl}/api/v1/call-fallback-rules/${ruleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(updates),
  })
  if (!res.ok) throw new Error(await readDetail(res, 'Could not update the fallback number.'))
  return res.json()
}

export async function deleteCallFallbackRule(
  ruleId: string,
  token?: string,
): Promise<void> {
  const res = await fetch(`${baseUrl}/api/v1/call-fallback-rules/${ruleId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new Error(await readDetail(res, 'Could not remove the fallback number.'))
}

// ---------------------------------------------------------------------------
// Voicemail-route kiosk
//
// Wired to the live backend (voicemail capture pipeline validated 2026-06-09):
//   GET   /api/v1/tenants/:id              -> routing_mode + call_setup_path +
//                                             voicemail_enabled + categories
//   GET   /api/v1/tenants/:id/voicemails   -> voicemail list
//   PATCH /api/v1/voicemails/:id/status    -> { status, reason? }
//   PATCH /api/v1/voicemails/:id/intent    -> { intent_category_key }
//
// The dev mockTenant / mockVoicemails fallbacks were removed so real backend
// responses are never masked (CHIRAN arch fact #362): the mock tenant carried
// routing_mode 'voicemail', which made any tenant fall through to Layout C
// with sample data whenever the config fetch failed. Config now returns null
// on failure (the kiosk router degrades to the SLA surface); the voicemail
// list returns [] on failure (empty state).
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
 * Tenant config for the kiosk route branch: routing_mode, call_setup_path,
 * voicemail_enabled + per-tenant category display names. Returns null when the
 * config cannot be resolved, so the kiosk router degrades to the SLA surface
 * rather than masking the failure with a mock voicemail tenant.
 */
export async function fetchTenantVoicemailConfig(
  tenantId: string,
  tenantName: string,
  token?: string,
): Promise<Tenant | null> {
  try {
    const res = await fetch(`${baseUrl}/api/v1/tenants/${tenantId}`, {
      headers: authHeaders(token),
    })
    if (res.ok) {
      const data: unknown = await res.json()
      if (isTenantConfig(data)) {
        // Keep the real id / name from the session or impersonation context
        // when the backend echoes blanks.
        return {
          ...data,
          id: data.id || tenantId,
          name: data.name || tenantName,
        }
      }
    }
  } catch {
    // network error -> treat as unresolved
  }
  return null
}

/** Voicemail list for a tenant. Returns [] on failure (empty state). */
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
    // fall through to the empty list
  }
  return []
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
