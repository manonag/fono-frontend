// API client for the eval gold-adjudication endpoints (T-299, backend-fed).
//
// Endpoints (all admin-gated, prefix `/api/v1/admin/eval-adjudication`):
//   GET  /rows?eval_name=...         -> AdjudicationRowsResponse
//   GET  /audio/{row_id}              -> AudioResolution
//   GET  /rulings?eval_name=...       -> { items: Ruling[] }
//   POST /rulings                     -> Ruling
//
// Speaker-id normalization (arch fact #246): Sarvam emits "0"/"1" in
// machine_diarization.entries. TranscriptColumn styles off "speaker_0" /
// "speaker_1". We normalize at this fetch boundary so no consumer has to.

import { config } from '@/lib/config'
import type {
  AdjudicationRow,
  AdjudicationRowsResponse,
  AudioResolution,
  RawDiarization,
  Ruling,
  TranscriptSegment,
} from './types'

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

function normalizeSpeakerId(rawId: string): string {
  return /^\d+$/.test(rawId) ? `speaker_${rawId}` : rawId
}

// Flatten + normalize the raw diarization envelope from the wire. Returns
// null when the envelope is missing or its entries list is empty, so the
// renderer can fall back to the flat `transcript`.
function normalizeSegments(raw: RawDiarization | null): TranscriptSegment[] | null {
  if (!raw || !raw.entries || raw.entries.length === 0) return null
  return raw.entries.map((e) => ({
    speaker_id: normalizeSpeakerId(e.speaker_id),
    transcript: e.transcript,
    start_time_seconds: e.start_time_seconds,
    end_time_seconds: e.end_time_seconds,
  }))
}

// Wire-format row as it arrives from /rows: segments is still the raw
// machine_diarization JSON envelope, not yet flattened.
interface WireRow extends Omit<AdjudicationRow, 'segments'> {
  segments: RawDiarization | null
}

interface WireResponse extends Omit<AdjudicationRowsResponse, 'rows'> {
  rows: WireRow[]
}

// Fetch the full eval (DIFFER rows + seed + segments + ruled overlay).
// Speaker ids are normalized on every segment before the rows are returned
// to the caller; nothing downstream should re-normalize.
export async function fetchRows(
  token: string,
  evalName: string,
): Promise<AdjudicationRowsResponse> {
  const url = `${BASE}/rows?eval_name=${encodeURIComponent(evalName)}`
  const res = await fetch(url, { headers: authHeaders(token) })
  if (!res.ok) throw new AdjudicationApiError(res.status, await readError(res))
  const body = (await res.json()) as WireResponse
  return {
    eval_name: body.eval_name,
    total: body.total,
    ruled_count: body.ruled_count,
    rows: body.rows.map((r) => ({
      ...r,
      segments: normalizeSegments(r.segments),
    })),
  }
}

// Resolve a DIFFER row_id to a short-lived presigned R2 URL.
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

// The effective overlay for an eval (latest ruling per row_id). Used to
// repaint queue badges after a save without re-fetching the full /rows
// payload, though /rows is the source of truth for ruled_count.
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

// Append one ruling to the gold_adjudications overlay. The migration's
// CHECK constraint enforces new_gold IN (six v2 taxonomy keys, FILTERED,
// KEEP, UNSCOREABLE); the caller is responsible for sending a valid value.
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
