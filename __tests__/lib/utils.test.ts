import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { formatCallTime } from '@/lib/utils'

/**
 * The clock-dependent buckets ("5m ago", "Yesterday", "3d ago") are tested
 * by freezing `Date.now()` at a known instant via `vi.useFakeTimers`.
 * The constants below pin every test to the same reference frame:
 * 2026-05-14 22:00:00 PT  =  2026-05-15 05:00:00 UTC.
 */

const LA = 'America/Los_Angeles'
const NY = 'America/New_York'

const NOW_UTC = '2026-05-15T05:00:00.000Z' // = 2026-05-14 22:00 PT

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW_UTC))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('formatCallTime — same-day buckets', () => {
  it('"Just now" for a call <1 minute old', () => {
    const result = formatCallTime('2026-05-15T04:59:30.000Z', LA)
    expect(result.relative).toBe('Just now')
    expect(result.combined).toMatch(/^Just now · \d{1,2}:\d{2} [AP]M$/)
  })

  it('"{n}m ago · h:mm a" for sub-hour same-day', () => {
    // 15 min before NOW = 2026-05-15T04:45 UTC = 21:45 PT
    const result = formatCallTime('2026-05-15T04:45:00.000Z', LA)
    expect(result.relative).toBe('15m ago')
    expect(result.absolute).toBe('9:45 PM')
    expect(result.combined).toBe('15m ago · 9:45 PM')
  })

  it('"{n}h ago · h:mm a" for same-day, ≥1h elapsed', () => {
    // 3 hours before NOW = 2026-05-15T02:00 UTC = 19:00 PT (same day in PT)
    const result = formatCallTime('2026-05-15T02:00:00.000Z', LA)
    expect(result.relative).toBe('3h ago')
    expect(result.absolute).toBe('7:00 PM')
    expect(result.combined).toBe('3h ago · 7:00 PM')
  })
})

describe('formatCallTime — calendar-day buckets in tenant TZ', () => {
  it('"Yesterday · h:mm a" for previous calendar day in PT', () => {
    // 2026-05-14T02:40 UTC = 2026-05-13 19:40 PT → previous calendar day
    const result = formatCallTime('2026-05-14T02:40:00.000Z', LA)
    expect(result.relative).toBe('Yesterday')
    expect(result.absolute).toBe('7:40 PM')
    expect(result.combined).toBe('Yesterday · 7:40 PM')
  })

  it('"{n}d ago · MMM d, h:mm a" for older this year', () => {
    // 3 calendar days before May 14 PT = May 11 PT
    // 2026-05-12T02:32 UTC = 2026-05-11 19:32 PT
    const result = formatCallTime('2026-05-12T02:32:00.000Z', LA)
    expect(result.relative).toBe('3d ago')
    expect(result.absolute).toBe('May 11, 7:32 PM')
    expect(result.combined).toBe('3d ago · May 11, 7:32 PM')
  })

  it('drops relative for prior year', () => {
    // 2024-11-14 14:47 PT = 2024-11-14T22:47 UTC
    const result = formatCallTime('2024-11-14T22:47:00.000Z', LA)
    expect(result.relative).toBe('')
    expect(result.absolute).toBe('Nov 14 2024, 2:47 PM')
    expect(result.combined).toBe('Nov 14 2024, 2:47 PM')
  })
})

describe('formatCallTime — TZ correctness', () => {
  it('NY vs LA produce different relative labels when a call straddles midnight only in one TZ', () => {
    // NOW for this test: 2026-05-16T02:00 UTC.
    //   LA (UTC-7): 2026-05-15 19:00 → today = May 15.
    //   NY (UTC-4): 2026-05-15 22:00 → today = May 15.
    // Both NOWs are firmly mid-day-15 — no midnight straddle in NOW.
    //
    // Call: 2026-05-14T05:30 UTC.
    //   LA: 2026-05-13 22:30 PT → call day = May 13. Diff = 2 days.
    //   NY: 2026-05-14 01:30 ET → call day = May 14. Diff = 1 day.
    //
    // The Call instant straddles midnight in LA's interpretation but
    // not in NY's, which is what produces the divergent label.
    vi.setSystemTime(new Date('2026-05-16T02:00:00.000Z'))
    const instant = '2026-05-14T05:30:00.000Z'
    const inLa = formatCallTime(instant, LA)
    const inNy = formatCallTime(instant, NY)
    expect(inLa.relative).toBe('2d ago')
    expect(inNy.relative).toBe('Yesterday')
  })

  it('null/empty tenantTimezone falls back to America/Los_Angeles', () => {
    const a = formatCallTime('2026-05-14T02:40:00.000Z', null)
    const b = formatCallTime('2026-05-14T02:40:00.000Z', '')
    const c = formatCallTime('2026-05-14T02:40:00.000Z', undefined)
    const ref = formatCallTime('2026-05-14T02:40:00.000Z', LA)
    expect(a).toEqual(ref)
    expect(b).toEqual(ref)
    expect(c).toEqual(ref)
  })
})

describe('formatCallTime — DST stability', () => {
  it('Mar 7 11 PM PT viewed Mar 9 2 AM PT reads "2d ago" not "1d ago"', () => {
    // The brief acknowledged the count itself depends on calendar
    // semantics — what we're proving here is that DST does not shift
    // the count up or down by accident: Mar 7 PT → Mar 9 PT is 2
    // calendar-day boundaries in tenant TZ even though only ~27 wall-
    // clock hours elapsed (Mar 8 was a 23-h day for spring-forward).
    vi.setSystemTime(new Date('2026-03-09T09:00:00.000Z')) // = 2026-03-09 02:00 PDT
    const call = '2026-03-08T06:30:00.000Z' // = 2026-03-07 22:30 PST
    const result = formatCallTime(call, LA)
    expect(result.relative).toBe('2d ago')
  })

  it('after fall-back, same instant still reads as expected calendar-day diff', () => {
    // Nov 1 was a 25-h day in PT (fall back). Confirm a call from the
    // 30th still reads "Yesterday" when viewed mid-day Nov 1.
    vi.setSystemTime(new Date('2026-11-01T20:00:00.000Z')) // 2026-11-01 12:00 PST
    const call = '2026-10-31T22:00:00.000Z' // 2026-10-31 15:00 PDT
    const result = formatCallTime(call, LA)
    expect(result.relative).toBe('Yesterday')
  })
})
