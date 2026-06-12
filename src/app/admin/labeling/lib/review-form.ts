// Form-state derivation for the labeling review editor. Extracted from
// ReviewPane so the dirty-on-open behaviour can be unit-tested against real
// recording-detail payloads (Sprint 1 escape: a freshly-claimed labeler row
// was falsely dirty, which disabled Swap all speakers).

import type { Status } from './enums'
import type { PatchPayload, RecordingDetail, VerifiedSegment } from './types'
import type { TagPanelValue } from '../components/TagPanel'

export interface FormState {
  verified_segments: VerifiedSegment[]
  status: Status
  tags: TagPanelValue
}

export interface InitialSnapshot {
  verified_segments: VerifiedSegment[]
  status: Status
  tags: TagPanelValue
}

export function cloneSegment(s: VerifiedSegment): VerifiedSegment {
  return {
    speaker_id: s.speaker_id,
    transcript: s.transcript,
    start_time_seconds: s.start_time_seconds,
    end_time_seconds: s.end_time_seconds,
  }
}

// Sarvam emits `speaker_id` as bare digit strings ("0", "1") in
// diarized_transcript. Rest of the UI (isToggleable, toggleSegmentSpeaker,
// styling) keys off the `speaker_<n>` form, so normalize at this boundary.
export function normalizeSpeakerId(rawId: string): string {
  return /^\d+$/.test(rawId) ? `speaker_${rawId}` : rawId
}

export function buildState(
  rec: RecordingDetail,
  isLabeler: boolean,
): { form: FormState; initial: InitialSnapshot } {
  const serverSegments = rec.verified_segments ?? []
  let displayedSegments: VerifiedSegment[]
  if (serverSegments.length > 0) {
    displayedSegments = serverSegments.map((s) => ({
      ...cloneSegment(s),
      speaker_id: normalizeSpeakerId(s.speaker_id),
    }))
  } else {
    const dia = rec.machine.diarization?.entries ?? []
    displayedSegments = dia.map((e) => ({
      speaker_id: normalizeSpeakerId(e.speaker_id),
      transcript: e.transcript,
      start_time_seconds: e.start_time_seconds,
      end_time_seconds: e.end_time_seconds,
    }))
  }

  const tags: TagPanelValue = {
    language_profile_tag: rec.language_profile_tag,
    call_type_tag: rec.call_type_tag,
    audio_quality_tag: rec.audio_quality_tag,
    error_tags: [...rec.error_tags],
    contains_menu_items: rec.contains_menu_items,
    contains_prices: rec.contains_prices,
    contains_phone_numbers: rec.contains_phone_numbers,
    contains_names: rec.contains_names,
    is_holdout: rec.is_holdout,
    reviewer_notes: rec.reviewer_notes ?? '',
  }

  // Owner convenience: pre-promote auto_labeled -> in_review in the form so
  // the Save button (and its one-click promote) is live on open, while
  // initial keeps the persisted status so computeDiff reports the change.
  // Labelers have no status dropdown (Submit always forces in_review and
  // releases the claim), so the pre-promotion is owner-only; otherwise a
  // just-opened owned labeler row is falsely dirty.
  const defaultFormStatus: Status =
    !isLabeler && rec.status === 'auto_labeled' ? 'in_review' : rec.status

  // Initial.verified_segments must mirror what is actually DISPLAYED, else a
  // fresh row (no server segments, form seeded from machine diarization) reads
  // as dirty on open. For owners the legacy behaviour (initial = server
  // segments) is preserved so a no-edit Save still persists the diarization
  // seed; for labelers initial mirrors the displayed seed so the row is clean
  // on open and Swap all speakers is available (Sprint 1 escape fix). Labeler
  // Submit always sends verified_segments regardless, so nothing is lost.
  const initialSegments: VerifiedSegment[] = isLabeler
    ? displayedSegments.map(cloneSegment)
    : serverSegments.map((s) => ({
        ...cloneSegment(s),
        speaker_id: normalizeSpeakerId(s.speaker_id),
      }))

  return {
    form: { verified_segments: displayedSegments, status: defaultFormStatus, tags },
    initial: {
      verified_segments: initialSegments,
      status: rec.status,
      tags: { ...tags, error_tags: [...tags.error_tags] },
    },
  }
}

function arraysEqualUnordered<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  for (const item of b) if (!sa.has(item)) return false
  return true
}

function segmentsEqual(a: VerifiedSegment[], b: VerifiedSegment[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].speaker_id !== b[i].speaker_id ||
      a[i].transcript !== b[i].transcript ||
      a[i].start_time_seconds !== b[i].start_time_seconds ||
      a[i].end_time_seconds !== b[i].end_time_seconds
    ) {
      return false
    }
  }
  return true
}

export function computeDiff(
  initial: InitialSnapshot,
  current: FormState,
): PatchPayload {
  const diff: PatchPayload = {}
  if (!segmentsEqual(initial.verified_segments, current.verified_segments)) {
    diff.verified_segments = current.verified_segments
  }
  if (initial.status !== current.status) diff.status = current.status
  const it = initial.tags
  const ct = current.tags
  if (it.language_profile_tag !== ct.language_profile_tag) {
    diff.language_profile_tag = ct.language_profile_tag
  }
  if (it.call_type_tag !== ct.call_type_tag) diff.call_type_tag = ct.call_type_tag
  if (it.audio_quality_tag !== ct.audio_quality_tag) {
    diff.audio_quality_tag = ct.audio_quality_tag
  }
  if (!arraysEqualUnordered(it.error_tags, ct.error_tags)) {
    diff.error_tags = ct.error_tags
  }
  if (it.contains_menu_items !== ct.contains_menu_items) {
    diff.contains_menu_items = ct.contains_menu_items
  }
  if (it.contains_prices !== ct.contains_prices) diff.contains_prices = ct.contains_prices
  if (it.contains_phone_numbers !== ct.contains_phone_numbers) {
    diff.contains_phone_numbers = ct.contains_phone_numbers
  }
  if (it.contains_names !== ct.contains_names) diff.contains_names = ct.contains_names
  if (it.is_holdout !== ct.is_holdout) diff.is_holdout = ct.is_holdout
  if ((it.reviewer_notes || '') !== (ct.reviewer_notes || '')) {
    diff.reviewer_notes = ct.reviewer_notes
  }
  return diff
}
