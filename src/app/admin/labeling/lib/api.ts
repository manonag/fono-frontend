import { config } from '@/lib/config'
import type {
  ActiveLabelersResponse,
  ClaimResult,
  LabelerView,
  MeResponse,
  PatchPayload,
  QueueFilter,
  QueueResponse,
  ReassignResult,
  RecordingDetail,
  ReleaseResult,
  ReviewQueueResponse,
  SortKey,
  StatsResponse,
} from './types'

const BASE = `${config.apiUrl}/api/v1/admin/labeling`
const ADMIN_BASE = `${config.apiUrl}/api/v1/admin`

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

// Structured error body shape returned by the claim/queue endpoints. The
// backend nests these under FastAPI's `detail` key, e.g.
//   { detail: { code: "not_claimed", claimed_by_name: "Mourya", ... } }
// Bites 3/4 route toasts on `code` (see lib/errors.ts). `detail` stays a
// human-readable string for the legacy string-detail paths.
export interface StructuredErrorDetail {
  code: string
  message?: string
  claimed_by_name?: string | null
  claimed_by_user_id?: string | null
  claimed_at?: string | null
  cap?: number
  current?: number
  allowed?: string[]
}

async function parseError(
  res: Response,
): Promise<{ detail: string; code: string | null; data: StructuredErrorDetail | null }> {
  try {
    const body = await res.json()
    if (body && typeof body === 'object' && 'detail' in body) {
      const detail = (body as { detail: unknown }).detail
      if (typeof detail === 'string') {
        return { detail, code: null, data: null }
      }
      if (detail && typeof detail === 'object' && 'code' in detail) {
        const data = detail as StructuredErrorDetail
        return {
          detail: data.message ?? JSON.stringify(detail),
          code: data.code,
          data,
        }
      }
      return { detail: JSON.stringify(detail), code: null, data: null }
    }
    return { detail: JSON.stringify(body), code: null, data: null }
  } catch {
    return {
      detail: res.statusText || `HTTP ${res.status}`,
      code: null,
      data: null,
    }
  }
}

export class LabelingApiError extends Error {
  status: number
  detail: string
  // Structured-error fields (null on legacy string-detail responses).
  code: string | null
  data: StructuredErrorDetail | null
  constructor(
    status: number,
    detail: string,
    code: string | null = null,
    data: StructuredErrorDetail | null = null,
  ) {
    super(`${status}: ${detail}`)
    this.status = status
    this.detail = detail
    this.code = code
    this.data = data
  }
}

async function errorFromResponse(res: Response): Promise<LabelingApiError> {
  const { detail, code, data } = await parseError(res)
  return new LabelingApiError(res.status, detail, code, data)
}

export async function fetchQueue(
  token: string,
  opts: {
    filter: QueueFilter
    sort: SortKey
    limit?: number
    offset?: number
    // Phase C.3 Sprint 1: labelers drive the queue with view=pending|mine.
    // When set, the backend ignores status and scopes by claim. Owners omit
    // it and keep the status-filter behaviour.
    view?: LabelerView
  },
  signal?: AbortSignal,
): Promise<QueueResponse> {
  const params = new URLSearchParams()
  if (opts.view) {
    params.set('view', opts.view)
  } else if (opts.filter !== 'all') {
    params.set('status', opts.filter)
  }
  params.set('sort', opts.sort)
  params.set('limit', String(opts.limit ?? 100))
  params.set('offset', String(opts.offset ?? 0))
  const res = await fetch(`${BASE}/queue?${params.toString()}`, {
    headers: authHeaders(token),
    signal,
  })
  if (!res.ok) throw await errorFromResponse(res)
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
  if (!res.ok) throw await errorFromResponse(res)
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
  if (!res.ok) throw await errorFromResponse(res)
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
  if (!res.ok) throw await errorFromResponse(res)
  return res.json()
}

// Phase C.3 Sprint 1: claim a recording for the current user. Throws a
// LabelingApiError with code 'claim_conflict' or 'claim_cap' on 409.
export async function claimRecording(
  token: string,
  recordingId: string,
): Promise<ClaimResult> {
  const res = await fetch(`${BASE}/${recordingId}/claim`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  if (!res.ok) throw await errorFromResponse(res)
  return res.json()
}

// Release a held claim back to the unclaimed pool (Release back to queue).
// Owners may force-release anyone's claim through the same endpoint.
export async function releaseRecording(
  token: string,
  recordingId: string,
): Promise<ReleaseResult> {
  const res = await fetch(`${BASE}/${recordingId}/release`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  if (!res.ok) throw await errorFromResponse(res)
  return res.json()
}

// Owner-only: move a claim to another labeler. Audit-logged server-side.
export async function reassignRecording(
  token: string,
  recordingId: string,
  newLabelerUserId: string,
): Promise<ReassignResult> {
  const res = await fetch(`${BASE}/${recordingId}/reassign`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_labeler_user_id: newLabelerUserId }),
  })
  if (!res.ok) throw await errorFromResponse(res)
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
  if (!res.ok) throw await errorFromResponse(res)
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
  if (!res.ok) throw await errorFromResponse(res)
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
  if (!res.ok) throw await errorFromResponse(res)
  return res.json()
}

export async function postHeartbeat(token: string): Promise<void> {
  const res = await fetch(`${ADMIN_BASE}/heartbeat`, {
    method: 'POST',
    headers: authHeaders(token),
  })
  if (!res.ok) throw await errorFromResponse(res)
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
  if (!res.ok) throw await errorFromResponse(res)
  return res.json()
}
