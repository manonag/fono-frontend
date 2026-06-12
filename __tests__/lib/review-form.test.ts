import { describe, expect, it } from 'vitest'

import {
  buildState,
  computeDiff,
  swapAllSegmentSpeakers,
  toggleSegmentSpeakerAt,
} from '@/app/admin/labeling/lib/review-form'
import { canLabelerSwap } from '@/app/admin/labeling/lib/claim-ownership'
import type { PatchPayload, RecordingDetail } from '@/app/admin/labeling/lib/types'

// Sprint 1 escape, second pass. Swap all speakers was disabled on a recording
// the labeler holds the claim on, even after the backend served
// claimed_by_user_id. Root cause: buildState seeds the form's verified_segments
// from machine diarization on a fresh (no server segments) row, while initial
// kept the empty server array, so the form was dirty on open and swap (disabled
// while dirty) stayed off. This test reproduces the EXACT prod payload Mano
// captured in DevTools and pins that a freshly-claimed labeler row is clean on
// open and swap is enabled.

const ME = '1b585bf4-7eb4-4df7-8e5b-d0cfdd554818'

// A fresh auto_labeled row claimed by the current user: verified_segments
// empty, form seeds from machine.diarization, all lock_* null, claimed_by set.
// Mirrors the prod GET response shape from the bug report.
function prodFreshClaimedRow(): RecordingDetail {
  return {
    recording_id: 'rec-1',
    review_id: 'rev-1',
    tenant_id: 'ten-1',
    tenant_name: 'Spice Garden',
    call: {
      id: 'call-1',
      twilio_call_sid: 'CA1',
      caller_number_masked: '***1234',
      call_status: 'completed',
      consent_status: 'accepted',
      started_at: null,
      ended_at: null,
      duration_seconds: 42,
    },
    recording: {
      id: 'r-1',
      twilio_recording_sid: 'RE1',
      duration_seconds: 42,
      file_size_bytes: 1000,
      r2_object_key: 'key',
      audio_url: 'https://r2/audio.mp3',
      audio_url_expires_in_seconds: 3600,
    },
    machine: {
      transcript: 'hello world',
      provider: 'sarvam',
      confidence_avg: null,
      language_code: 'en',
      language_tags: null,
      diarization: {
        entries: [
          { speaker_id: '0', transcript: 'hello', start_time_seconds: 0, end_time_seconds: 1 },
          { speaker_id: '1', transcript: 'world', start_time_seconds: 1, end_time_seconds: 2 },
        ],
      },
      timestamps: null,
      raw_response: null,
      labeled_at: null,
    },
    verified_transcript: null,
    verified_segments: [], // fresh: never saved
    verified_at: null,
    verified_by: null,
    error_tags: [],
    error_count: 0,
    audio_quality_tag: null,
    language_profile_tag: null,
    call_type_tag: null,
    contains_menu_items: false,
    contains_prices: false,
    contains_phone_numbers: false,
    contains_names: false,
    status: 'auto_labeled',
    is_holdout: false,
    reviewer_notes: null,
    created_at: '2026-06-12T00:00:00Z',
    updated_at: '2026-06-12T00:00:00Z',
    lock_holder_user_id: null,
    lock_holder_name: null,
    lock_acquired_at: null,
    lock_expires_at: null,
    labeler_user_id: null,
    reviewed_by_user_id: null,
    claimed_by_user_id: ME,
    claimed_at: '2026-06-12T00:00:00Z',
    reviewer_notes_for_labeler: null,
    owner_segments: null,
    owner_review_at: null,
  }
}

describe('buildState dirty-on-open (prod payload)', () => {
  it('labeler: fresh claimed row is NOT dirty on open, so swap is enabled', () => {
    const rec = prodFreshClaimedRow()
    const { form, initial } = buildState(rec, true)
    const diff = computeDiff(initial, form)
    expect(diff).toEqual({}) // clean on open

    const dirty = Object.keys(diff).length > 0
    expect(
      canLabelerSwap({
        claimedByUserId: rec.claimed_by_user_id,
        currentUserId: ME,
        dirty,
        busy: false,
      }),
    ).toBe(true)
  })

  it('owner: same fresh row stays dirty on open (Save-on-open preserved)', () => {
    const rec = prodFreshClaimedRow()
    const { form, initial } = buildState(rec, false)
    const diff = computeDiff(initial, form)
    // Owner pre-promotion still reports the status change so Save lights up.
    expect(diff.status).toBe('in_review')
  })

  it('labeler: a real segment edit re-dirties and disables swap', () => {
    const rec = prodFreshClaimedRow()
    const { form, initial } = buildState(rec, true)
    const edited = {
      ...form,
      verified_segments: form.verified_segments.map((s, i) =>
        i === 0 ? { ...s, transcript: 'HELLO (edited)' } : s,
      ),
    }
    const diff = computeDiff(initial, edited)
    expect(diff.verified_segments).toBeDefined()
    const dirty = Object.keys(diff).length > 0
    expect(
      canLabelerSwap({
        claimedByUserId: rec.claimed_by_user_id,
        currentUserId: ME,
        dirty,
        busy: false,
      }),
    ).toBe(false)
  })

  it('labeler: swap stays disabled when the row is claimed by someone else', () => {
    const rec = { ...prodFreshClaimedRow(), claimed_by_user_id: 'someone-else' }
    const { form, initial } = buildState(rec, true)
    const dirty = Object.keys(computeDiff(initial, form)).length > 0
    expect(
      canLabelerSwap({
        claimedByUserId: rec.claimed_by_user_id,
        currentUserId: ME,
        dirty,
        busy: false,
      }),
    ).toBe(false)
  })
})

// Hotfix 3: client-side speaker flips operate on the seeded form layer so they
// take effect on a fresh row (empty server verified_segments), where the old
// server swap was a silent no-op.
describe('client-side speaker flips on the seeded form (prod payload)', () => {
  it('swap-all flips every seeded segment and dirties the form', () => {
    const rec = prodFreshClaimedRow()
    const { form, initial } = buildState(rec, true)
    // Seeded from diarization "0"/"1" -> speaker_0 / speaker_1.
    expect(form.verified_segments.map((s) => s.speaker_id)).toEqual([
      'speaker_0',
      'speaker_1',
    ])

    const swapped = swapAllSegmentSpeakers(form.verified_segments)
    expect(swapped.map((s) => s.speaker_id)).toEqual(['speaker_1', 'speaker_0'])
    // transcripts/timings untouched
    expect(swapped.map((s) => s.transcript)).toEqual(['hello', 'world'])

    // Flipping the form layer makes computeDiff report a segment change.
    const diff = computeDiff(initial, { ...form, verified_segments: swapped })
    expect(diff.verified_segments).toBeDefined()
  })

  it('per-segment toggle flips exactly one segment', () => {
    const rec = prodFreshClaimedRow()
    const { form } = buildState(rec, true)
    const toggled = toggleSegmentSpeakerAt(form.verified_segments, 0)
    expect(toggled.map((s) => s.speaker_id)).toEqual(['speaker_1', 'speaker_1'])
    // index 1 untouched
    expect(toggled[1]).toEqual(form.verified_segments[1])
  })

  it('Submit persists the flipped speakers (doSubmit payload shape)', () => {
    const rec = prodFreshClaimedRow()
    const { form, initial } = buildState(rec, true)
    const swappedForm = {
      ...form,
      verified_segments: swapAllSegmentSpeakers(form.verified_segments),
    }
    // Mirrors ReviewPane.doSubmit: always include verified_segments.
    const payload: PatchPayload = {
      ...computeDiff(initial, swappedForm),
      verified_segments: swappedForm.verified_segments,
    }
    expect(payload.verified_segments?.map((s) => s.speaker_id)).toEqual([
      'speaker_1',
      'speaker_0',
    ])
  })
})
