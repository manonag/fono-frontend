// Types for the eval gold-adjudication mode (T-299, backend-fed).
//
// Pairs with backend service `app/services/eval_adjudication.py`. The legacy
// CSV-loader types from PR #15 are removed; this file types the live
// /api/v1/admin/eval-adjudication endpoints instead.

// A diarized transcript segment after speaker-id normalization at the fetch
// boundary (per arch fact #246). The renderer expects "speaker_0" / "speaker_1"
// forms; Sarvam emits bare "0" / "1" in machine_diarization.entries.
export interface TranscriptSegment {
  speaker_id: string
  transcript: string
  start_time_seconds: number
  end_time_seconds: number
}

// Raw segments envelope as it sits on the wire (the DB column is the JSON
// machine_diarization blob from TranscriptReview). Only used inside api.ts;
// the normalized flat array is what reaches the renderer.
export interface RawDiarization {
  entries?: Array<{
    speaker_id: string
    transcript: string
    start_time_seconds: number
    end_time_seconds: number
  }>
}

// One DIFFER row served by GET /rows. Tag is one of "PROMPT" /
// "CONTESTABLE_GOLD" / "BOUNDARY" or "" (boundary catch-all in the seed).
export interface AdjudicationRow {
  row_id: string
  display_id: string
  tag: string
  gold: string
  predicted: string
  model_reason: string
  note: string
  listen_for: string
  // null when the underlying TranscriptReview is missing or its machine
  // diarization is empty; renderer should fall back to `transcript`.
  segments: TranscriptSegment[] | null
  transcript: string | null
  duration: number | null
  recording_id: string | null
  ruling: Ruling | null
}

// Response envelope from GET /rows.
export interface AdjudicationRowsResponse {
  eval_name: string
  total: number
  ruled_count: number
  rows: AdjudicationRow[]
}

// A ruling already recorded in the gold_adjudications overlay.
export interface Ruling {
  row_id: string
  old_gold: string
  new_gold: string
  reason: string | null
  reviewer: string
  ruled_at: string
}

// Outcome of resolving a DIFFER row to playable audio. Always returns a
// body; an unresolvable row carries available=false plus a reason.
export interface AudioResolution {
  row_id: string
  recording_id: string | null
  available: boolean
  audio_url: string | null
  reason: string | null
}

// The six v2 taxonomy keys plus FILTERED: the values a "correct to" ruling
// can pick. KEEP and UNSCOREABLE are separate verbs (not labels), so the
// payload's new_gold takes either a CorrectionLabel or one of those verbs.
export const CORRECTION_LABELS = [
  'order',
  'reservation',
  'menu_question',
  'catering',
  'banquet_hall',
  'others',
  'FILTERED',
] as const

export type CorrectionLabel = (typeof CORRECTION_LABELS)[number]

// KEEP affirms the committed gold (still scoreable), CORRECT changes it,
// UNSCOREABLE drops the row from the eval's scoreable set.
export type RulingVerb = 'KEEP' | 'CORRECT' | 'UNSCOREABLE'

// Left-pane filter chips on the queue. "all" is the default selection.
export type QueueFilterChip =
  | 'all'
  | 'PROMPT'
  | 'CONTESTABLE_GOLD'
  | 'BOUNDARY'
  | 'unruled'
