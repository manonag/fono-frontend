import { describe, expect, it } from 'vitest'

import {
  computeDiff,
  mergeSegmentsAt,
  splitSegmentAtWord,
  toggleSegmentSpeakerAt,
} from '@/app/admin/labeling/lib/review-form'
import type { VerifiedSegment } from '@/app/admin/labeling/lib/types'

// Split-segment tool (cf15b2f4). Sarvam merges two speakers into one segment
// ("Hi Thecha Sunnyvale Hi is it Vidya" all S1; the second sentence is S2).
// Split at the word boundary fixes the merge.

function mergedOpening(): VerifiedSegment[] {
  return [
    {
      speaker_id: 'speaker_0',
      transcript: 'Hi Thecha Sunnyvale Hi is it Vidya',
      start_time_seconds: 0,
      end_time_seconds: 7,
    },
  ]
}

describe('splitSegmentAtWord', () => {
  it('splits into two segments with proportional times and flipped 2nd speaker', () => {
    const out = splitSegmentAtWord(mergedOpening(), 0, 3) // before the 2nd "Hi"
    expect(out).toHaveLength(2)
    expect(out[0].transcript).toBe('Hi Thecha Sunnyvale')
    expect(out[1].transcript).toBe('Hi is it Vidya')
    // first piece keeps the original speaker, second flips to the other
    expect(out[0].speaker_id).toBe('speaker_0')
    expect(out[1].speaker_id).toBe('speaker_1')
    // times: piece1 starts at the original start, piece2 ends at original end,
    // boundary interpolated by character proportion (continuous, monotonic)
    expect(out[0].start_time_seconds).toBe(0)
    expect(out[1].end_time_seconds).toBe(7)
    const t = out[0].end_time_seconds
    expect(out[1].start_time_seconds).toBe(t)
    expect(t).toBeGreaterThan(0)
    expect(t).toBeLessThan(7)
    const left = 'Hi Thecha Sunnyvale'.length
    const total = left + 'Hi is it Vidya'.length
    expect(t).toBeCloseTo((7 * left) / total, 5)
  })

  it('the two pieces toggle independently afterwards', () => {
    const split = splitSegmentAtWord(mergedOpening(), 0, 3)
    const toggled = toggleSegmentSpeakerAt(split, 1) // flip piece2 back
    expect(toggled[0].speaker_id).toBe('speaker_0')
    expect(toggled[1].speaker_id).toBe('speaker_0')
    expect(toggled[0]).toEqual(split[0]) // piece1 untouched
  })

  it('Submit persists the split segments (doSubmit payload shape)', () => {
    const initial = { verified_segments: mergedOpening(), status: 'auto_labeled' as const, tags: {
      language_profile_tag: null, call_type_tag: null, audio_quality_tag: null,
      error_tags: [], contains_menu_items: false, contains_prices: false,
      contains_phone_numbers: false, contains_names: false, is_holdout: false,
      reviewer_notes: '',
    } }
    const splitSegments = splitSegmentAtWord(mergedOpening(), 0, 3)
    const form = { ...initial, verified_segments: splitSegments }
    const diff = computeDiff(initial, form)
    expect(diff.verified_segments).toHaveLength(2)
  })

  it('splitting twice within one original segment works', () => {
    const once = splitSegmentAtWord(mergedOpening(), 0, 3) // [3 words, 4 words]
    const twice = splitSegmentAtWord(once, 1, 1) // split piece2 ("Hi" | "is it Vidya")
    expect(twice).toHaveLength(3)
    expect(twice.map((s) => s.transcript)).toEqual([
      'Hi Thecha Sunnyvale',
      'Hi',
      'is it Vidya',
    ])
  })

  it('is a no-op at the segment ends (no boundary there)', () => {
    const segs = mergedOpening()
    expect(splitSegmentAtWord(segs, 0, 0)).toEqual(segs)
    expect(splitSegmentAtWord(segs, 0, 7)).toEqual(segs) // 7 words -> max valid is 6
  })
})

describe('mergeSegmentsAt (mis-split recovery)', () => {
  it('rejoins a split back into the previous segment', () => {
    const split = splitSegmentAtWord(mergedOpening(), 0, 3)
    const rejoined = mergeSegmentsAt(split, 1)
    expect(rejoined).toHaveLength(1)
    expect(rejoined[0].transcript).toBe('Hi Thecha Sunnyvale Hi is it Vidya')
    expect(rejoined[0].speaker_id).toBe('speaker_0')
    expect(rejoined[0].start_time_seconds).toBe(0)
    expect(rejoined[0].end_time_seconds).toBe(7)
  })

  it('is a no-op for the first segment or out of range', () => {
    const segs = splitSegmentAtWord(mergedOpening(), 0, 3)
    expect(mergeSegmentsAt(segs, 0)).toEqual(segs)
    expect(mergeSegmentsAt(segs, 5)).toEqual(segs)
  })
})
