// Types for the eval gold-adjudication mode (T-299).

// One row of an eval DIFFER report (gate5_differ_report.csv).
export interface DifferRow {
  row_id: string
  gold: string
  predicted: string
  reason: string
  tag: string // PROMPT / CONTESTABLE_GOLD / BOUNDARY, may be empty
  transcript: string
}

// One row of the Claude-supplied seed (differ_adjudication.csv). listen_for
// is added by Mano in a later pass; it is empty until then.
export interface SeedRow {
  row_id: string
  tag: string
  note: string
  listen_for: string
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

// Outcome of resolving a DIFFER row to playable audio.
export interface AudioResolution {
  row_id: string
  recording_id: string | null
  available: boolean
  audio_url: string | null
  reason: string | null
}

// The six v2 taxonomy keys plus FILTERED: the values a "correct to" ruling
// can pick. KEEP and UNSCOREABLE are separate ruling verbs, not labels.
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

// KEEP affirms the gold (still scored), CORRECT changes it, UNSCOREABLE
// drops the row from the eval's scoreable set.
export type RulingVerb = 'KEEP' | 'CORRECT' | 'UNSCOREABLE'
