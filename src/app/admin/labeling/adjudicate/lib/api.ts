// API client for the eval gold-adjudication endpoints (T-299).

import { config } from '@/lib/config'
import type { AudioResolution, Ruling } from './types'

const BASE = `${config.apiUrl}/api/v1/admin/eval-adjudication`

export class AdjudicationApiError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(`${status}: ${detail}`)
    this.status = status
    this.detail = detail
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json()
    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail
      return typeof detail === 'string' ? detail : JSON.stringify(detail)
    }
    return JSON.stringify(body)
  } catch {
    return res.statusText || `HTTP ${res.status}`
  }
}

// Resolve a DIFFER row_id to a short-lived presigned R2 URL. Always returns
// a body: an unresolvable row carries available=false plus a reason.
export async function fetchAudio(
  token: string,
  rowId: string,
): Promise<AudioResolution> {
  const res = await fetch(`${BASE}/audio/${rowId}`, {
    headers: authHeaders(token),
  })
  if (!res.ok) throw new AdjudicationApiError(res.status, await readError(res))
  return res.json()
}

// The effective overlay for an eval: the latest ruling per row_id.
export async function fetchRulings(
  token: string,
  evalName: string,
): Promise<Ruling[]> {
  const url = `${BASE}/rulings?eval_name=${encodeURIComponent(evalName)}`
  const res = await fetch(url, { headers: authHeaders(token) })
  if (!res.ok) throw new AdjudicationApiError(res.status, await readError(res))
  const body = await res.json()
  return (body?.items as Ruling[]) ?? []
}

export interface PostRulingInput {
  eval_name: string
  row_id: string
  old_gold: string
  new_gold: string
  reason: string | null
}

// Append one ruling to the gold_adjudications overlay.
export async function postRuling(
  token: string,
  input: PostRulingInput,
): Promise<Ruling> {
  const res = await fetch(`${BASE}/rulings`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new AdjudicationApiError(res.status, await readError(res))
  return res.json()
}
