import { config } from './config'

export interface DashboardSummary {
  total_calls: number
  missed_calls: number
  answered_calls: number
  total_duration_seconds: number
  total_recordings: number
  period: string
}

export interface Call {
  id: string
  caller_number: string
  callee_number: string
  status: 'answered' | 'missed' | 'in-progress' | 'ringing'
  duration: number
  recording_url: string | null
  created_at: string
  tenant_id: string
}

export interface PaginatedCalls {
  calls: Call[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface BridgeRequest {
  phone_number?: string
  tenant_id: string
  call_id?: string
}

export interface BridgeResponse {
  call_id: string
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${config.apiUrl}${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new ApiError(res.status, `API error ${res.status}: ${text}`)
  }

  return res.json()
}

export async function fetchSummary(tenantId: string, days?: number): Promise<DashboardSummary> {
  const params = days ? `?days=${days}` : ''
  return apiFetch<DashboardSummary>(`/api/v1/dashboard/${tenantId}/summary${params}`)
}

export async function fetchCalls(
  tenantId: string,
  params: { page?: number; per_page?: number; status?: string }
): Promise<PaginatedCalls> {
  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.per_page) searchParams.set('per_page', String(params.per_page))
  if (params.status) searchParams.set('status', params.status)
  const qs = searchParams.toString()
  return apiFetch<PaginatedCalls>(`/api/v1/dashboard/${tenantId}/calls${qs ? `?${qs}` : ''}`)
}

export async function bridgeCall(tenantId: string, phoneNumber: string): Promise<BridgeResponse> {
  return apiFetch<BridgeResponse>('/api/v1/calls/bridge', {
    method: 'POST',
    body: JSON.stringify({ tenant_id: tenantId, phone_number: phoneNumber }),
  })
}
