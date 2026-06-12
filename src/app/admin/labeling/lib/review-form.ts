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

// Speaker flips operate on the CLIENT form-state segments (the effective,
// possibly diarization-seeded working layer), not the server endpoint. On a
// fresh row the server verified_segments is empty, so a server-side swap is a
// silent no-op; flipping the form layer and letting Submit/Save persist is the
// correct, instant-feedback behaviour and matches the per-segment toggle.
export function flipSpeakerId(speakerId: string): string {
  if (speakerId === 'speaker_0') return 'speaker_1'
  if (speakerId === 'speaker_1') return 'speaker_0'
  return speakerId
}

export function swapAllSegmentSpeakers(
  segments: VerifiedSegment[],
): VerifiedSegment[] {
  return segments.map((s) => ({ ...s, speaker_id: flipSpeakerId(s.speaker_id) }))
}

export function toggleSegmentSpeakerAt(
  segments: VerifiedSegment[],
  idx: number,
): VerifiedSegment[] {
  return segments.map((s, i) =>
    i === idx ? { ...s, speaker_id: flipSpeakerId(s.speaker_id) } : s,
  )
}

// Split-segment tool (cf15b2f4). Sarvam diarization sometimes merges two
// speakers into one segment; toggle/swap reassign whole segments and cannot
// fix that. splitSegmentAtWord splits the segment at a word boundary: wordIdx
// is the index of the first word of the SECOND piece (1 .. wordCount-1).
//
// Timing: no word-level timestamps exist, so the boundary time is interpolated
// proportionally by character count of the two pieces within the segment's
// [start, end]. Good enough for karaoke; exactness is not required.
//
// Speaker defaults: the first piece keeps the original speaker; the second
// piece defaults to the OTHER speaker (the reason to split is a speaker
// change). Both remain individually togglable afterwards.
export function splitSegmentAtWord(
  segments: VerifiedSegment[],
  segIdx: number,
  wordIdx: number,
): VerifiedSegment[] {
  const seg = segments[segIdx]
  if (!seg) return segments
  const words = seg.transcript.split(/\s+/).filter(Boolean)
  // Only interior boundaries are valid; nothing to split at the ends.
  if (wordIdx <= 0 || wordIdx >= words.length) return segments

  const leftText = words.slice(0, wordIdx).join(' ')
  const rightText = words.slice(wordIdx).join(' ')
  const total = leftText.length + rightText.length
  const span = seg.end_time_seconds - seg.start_time_seconds
  const splitTime =
    total > 0
      ? seg.start_time_seconds + (span * leftText.length) / total
      : seg.start_time_seconds

  const left: VerifiedSegment = {
    speaker_id: seg.speaker_id,
    transcript: leftText,
    start_time_seconds: seg.start_time_seconds,
    end_time_seconds: splitTime,
  }
  const right: VerifiedSegment = {
    speaker_id: flipSpeakerId(seg.speaker_id),
    transcript: rightText,
    start_time_seconds: splitTime,
    end_time_seconds: seg.end_time_seconds,
  }
  return [...segments.slice(0, segIdx), left, right, ...segments.slice(segIdx + 1)]
}

// Mis-split recovery: rejoin segment segIdx into the previous one. The merged
// piece keeps the first piece's speaker and spans both time ranges. Chosen
// over the doc-only "Release + re-claim resets the seed" option because it is
// cheap and fixes a mis-split without discarding the rest of the labeler's
// work.
export function mergeSegmentsAt(
  segments: VerifiedSegment[],
  segIdx: number,
): VerifiedSegment[] {
  if (segIdx <= 0 || segIdx >= segments.length) return segments
  const prev = segments[segIdx - 1]
  const cur = segments[segIdx]
  const merged: VerifiedSegment = {
    speaker_id: prev.speaker_id,
    transcript: `${prev.transcript} ${cur.transcript}`.trim(),
    start_time_seconds: prev.start_time_seconds,
    end_time_seconds: cur.end_time_seconds,
  }
  return [...segments.slice(0, segIdx - 1), merged, ...segments.slice(segIdx + 1)]
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
