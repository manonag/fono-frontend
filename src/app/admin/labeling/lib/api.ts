import { config } from '@/lib/config'
import type {
  ActiveLabelersResponse,
  MeResponse,
  PatchPayload,
  QueueFilter,
  QueueResponse,
  RecordingDetail,
  ReviewQueueResponse,
  SortKey,
  StatsResponse,
} from './types'

const BASE = `${config.apiUrl}/api/v1/admin/labeling`
const ADMIN_BASE = `${config.apiUrl}/api/v1/admin`

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
  opts: { acquireLock?: boolean } = {},
): Promise<RecordingDetail> {
  const url =
    opts.acquireLock === false
      ? `${BASE}/${recordingId}?acquire_lock=false`
      : `${BASE}/${recordingId}`
  const res = await fetch(url, {
    headers: authHeaders(token),
    signal,
  })
  if (!res.ok) throw new LabelingApiError(res.status, await readError(res))
  return res.json()
}

export interface PatchRecordingResult {
  recording_id: string
  status_before: string
  status_after: string
  fields_updated: string[]
  verified_at: string | null
  verified_by: string | null
  updated_at: string | null
}

export async function patchRecording(
  token: string,
  recordingId: string,
  payload: PatchPayload,
): Promise<PatchRecordingResult> {
  const res = await fetch(`${BASE}/${recordingId}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new LabelingApiError(res.status, await readError(res))
  return res.json()
}

// Bulk speaker swap (Sprint 1). Flips 0<->1 across the entire recording's
// reviewer working layer. Returns the full updated RecordingDetail so the
// caller can replace local state without a second fetch.
export async function swapAllSpeakers(
  token: string,
  recordingId: string,
): Promise<RecordingDetail> {
  const res = await fetch(`${BASE}/${recordingId}/swap-speakers`, {
    method: 'POST',
    headers: authHeaders(token),
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

export async function fetchMe(
  token: string,
  signal?: AbortSignal,
): Promise<MeResponse> {
  const res = await fetch(`${ADMIN_BASE}/me`, {
    headers: authHeaders(token),
    signal,
  })
  if (!res.ok) throw new LabelingApiError(res.status, await readError(res))
  return res.json()
}

export async function fetchActiveLabelers(
  token: string,
  signal?: AbortSignal,
): Promise<ActiveLabelersResponse> {
  const res = await fetch(`${BASE}/active-labelers`, {
    headers: authHeaders(token),
    signal,
  })
  if (!res.ok) throw new LabelingApiError(res.status, await readError(res))
  return res.json()
}

export async function postHeartbeat(token: string): Promise<void> {
  const res = await fetch(`${ADMIN_BASE}/heartbeat`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  if (!res.ok) throw new LabelingApiError(res.status, await readError(res))
}

export async function fetchReviewQueue(
  token: string,
  opts: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<ReviewQueueResponse> {
  const params = new URLSearchParams()
  params.set('limit', String(opts.limit ?? 100))
  params.set('offset', String(opts.offset ?? 0))
  const res = await fetch(`${BASE}/review-queue?${params.toString()}`, {
    headers: authHeaders(token),
    signal,
  })
  if (!res.ok) throw new LabelingApiError(res.status, await readError(res))
  return res.json()
}
