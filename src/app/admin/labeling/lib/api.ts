import { config } from '@/lib/config'
import type {
  PatchPayload,
  QueueFilter,
  QueueResponse,
  RecordingDetail,
  SortKey,
  StatsResponse,
} from './types'

const BASE = `${config.apiUrl}/api/v1/admin/labeling`

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

export class LabelingApiError extends Error {
  status: number
  detail: string
  constructor(status: number, detail: string) {
    super(`${status}: ${detail}`)
    this.status = status
    this.detail = detail
  }
}

export async function fetchQueue(
  token: string,
  opts: { filter: QueueFilter; sort: SortKey; limit?: number; offset?: number },
  signal?: AbortSignal,
): Promise<QueueResponse> {
  const params = new URLSearchParams()
  if (opts.filter !== 'all') params.set('status', opts.filter)
  params.set('sort', opts.sort)
  params.set('limit', String(opts.limit ?? 100))
  params.set('offset', String(opts.offset ?? 0))
  const res = await fetch(`${BASE}/queue?${params.toString()}`, {
    headers: authHeaders(token),
    signal,
  })
  if (!res.ok) throw new LabelingApiError(res.status, await readError(res))
  return res.json()
}

export async function fetchRecording(
  token: string,
  recordingId: string,
  signal?: AbortSignal,
): Promise<RecordingDetail> {
  const res = await fetch(`${BASE}/${recordingId}`, {
    headers: authHeaders(token),
    signal,
  })
  if (!res.ok) throw new LabelingApiError(res.status, await readError(res))
  return res.json()
}

export async function patchRecording(
  token: string,
  recordingId: string,
  payload: PatchPayload,
): Promise<RecordingDetail> {
  const res = await fetch(`${BASE}/${recordingId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new LabelingApiError(res.status, await readError(res))
  return res.json()
}

export async function fetchStats(
  token: string,
  signal?: AbortSignal,
): Promise<StatsResponse> {
  const res = await fetch(`${BASE}/stats`, {
    headers: authHeaders(token),
    signal,
  })
  if (!res.ok) throw new LabelingApiError(res.status, await readError(res))
  return res.json()
}
