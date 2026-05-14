// API client for the /admin/insights dashboard (sprint 1610b462).
// Mirrors the src/app/admin/users/lib/api.ts pattern: typed functions,
// a dedicated error class, and a shared detail-extracting readError.

import { config } from '@/lib/config'
import type { ConversationDetail, SessionsResponse } from './types'

const BASE = `${config.apiUrl}/api/v1/admin/tara-insights`

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail
      if (typeof detail === 'string') return detail
      return JSON.stringify(detail)
    }
    return JSON.stringify(body)
  } catch {
    return res.statusText || `HTTP ${res.status}`
  }
}

export class TaraInsightsApiError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(`${status}: ${detail}`)
    this.status = status
    this.detail = detail
  }
}

export interface SessionsQuery {
  hotLeadsOnly?: boolean
  dateFrom?: string
  dateTo?: string
  primaryIntent?: string[]
  emotionalTone?: string[]
  hotLeadConfidence?: string[]
  showExcluded?: boolean
  limit?: number
  offset?: number
}

export async function fetchSessions(
  token: string,
  query: SessionsQuery,
  signal?: AbortSignal,
): Promise<SessionsResponse> {
  const params = new URLSearchParams()
  if (query.hotLeadsOnly) params.set('hot_leads_only', 'true')
  if (query.dateFrom) params.set('date_from', query.dateFrom)
  if (query.dateTo) params.set('date_to', query.dateTo)
  for (const v of query.primaryIntent ?? []) params.append('primary_intent', v)
  for (const v of query.emotionalTone ?? []) params.append('emotional_tone', v)
  for (const v of query.hotLeadConfidence ?? []) {
    params.append('hot_lead_confidence', v)
  }
  if (query.showExcluded) params.set('show_excluded', 'true')
  if (query.limit != null) params.set('limit', String(query.limit))
  if (query.offset != null) params.set('offset', String(query.offset))
  const qs = params.toString()
  const res = await fetch(`${BASE}/sessions${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(token),
    signal,
  })
  if (!res.ok) throw new TaraInsightsApiError(res.status, await readError(res))
  return res.json()
}

export async function fetchConversation(
  token: string,
  conversationId: string,
  signal?: AbortSignal,
): Promise<ConversationDetail> {
  const res = await fetch(`${BASE}/conversations/${conversationId}`, {
    headers: authHeaders(token),
    signal,
  })
  if (!res.ok) throw new TaraInsightsApiError(res.status, await readError(res))
  return res.json()
}
