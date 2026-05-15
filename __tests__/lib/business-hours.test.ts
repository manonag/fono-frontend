import { describe, expect, it } from 'vitest'

import {
  HARDCODED_BUSINESS_HOURS,
  bucketHours,
  isWorkingHour,
  type BusinessHours,
} from '@/lib/analytics/business-hours'

describe('isWorkingHour - same-day window (Thecha 10..22)', () => {
  const bh: BusinessHours = HARDCODED_BUSINESS_HOURS

  it('returns true for hours inside the open window', () => {
    expect(isWorkingHour(10, bh)).toBe(true)
    expect(isWorkingHour(12, bh)).toBe(true)
    expect(isWorkingHour(21, bh)).toBe(true)
  })

  it('returns false for the close_hour itself (window is half-open)', () => {
    expect(isWorkingHour(22, bh)).toBe(false)
  })

  it('returns false for closed pre-open and post-close hours', () => {
    expect(isWorkingHour(0, bh)).toBe(false)
    expect(isWorkingHour(9, bh)).toBe(false)
    expect(isWorkingHour(23, bh)).toBe(false)
  })

  it('returns false for invalid hour inputs', () => {
    expect(isWorkingHour(-1, bh)).toBe(false)
    expect(isWorkingHour(24, bh)).toBe(false)
    expect(isWorkingHour(Number.NaN, bh)).toBe(false)
  })
})

describe('isWorkingHour - overnight window crossing midnight', () => {
  const bh: BusinessHours = { open_hour: 18, close_hour: 2 }

  it('treats hours after open_hour through 23 as open', () => {
    expect(isWorkingHour(18, bh)).toBe(true)
    expect(isWorkingHour(20, bh)).toBe(true)
    expect(isWorkingHour(23, bh)).toBe(true)
  })

  it('treats hours from 0 up to (but not including) close_hour as open', () => {
    expect(isWorkingHour(0, bh)).toBe(true)
    expect(isWorkingHour(1, bh)).toBe(true)
    expect(isWorkingHour(2, bh)).toBe(false)
  })

  it('treats daytime hours outside the window as closed', () => {
    expect(isWorkingHour(3, bh)).toBe(false)
    expect(isWorkingHour(12, bh)).toBe(false)
    expect(isWorkingHour(17, bh)).toBe(false)
  })
})

describe('isWorkingHour - 24-hour edge cases', () => {
  it('open_hour=0, close_hour=24 means always open', () => {
    const bh: BusinessHours = { open_hour: 0, close_hour: 24 }
    for (let h = 0; h < 24; h++) {
      expect(isWorkingHour(h, bh)).toBe(true)
    }
  })

  it('close_hour=24 with open_hour > 0 includes hour 23', () => {
    const bh: BusinessHours = { open_hour: 20, close_hour: 24 }
    expect(isWorkingHour(20, bh)).toBe(true)
    expect(isWorkingHour(23, bh)).toBe(true)
    expect(isWorkingHour(19, bh)).toBe(false)
    expect(isWorkingHour(0, bh)).toBe(false)
  })
})

describe('bucketHours - Thecha same-day window', () => {
  const bh: BusinessHours = HARDCODED_BUSINESS_HOURS

  it('splits a typical day into 12 working buckets and a single closed sum', () => {
    // hours 0..9 each have 100 calls (pre-open noise)
    // hours 10..21 each have a small ramp 1..12 (working)
    // hours 22..23 each have 100 calls (post-close noise)
    const callsByHour: number[] = Array(24).fill(0)
    for (let h = 0; h < 10; h++) callsByHour[h] = 100
    for (let h = 10; h < 22; h++) callsByHour[h] = h - 9 // 1..12
    callsByHour[22] = 100
    callsByHour[23] = 100

    const result = bucketHours(callsByHour, bh)

    expect(result.workingHours).toHaveLength(12)
    expect(result.workingHours[0]).toEqual({ hour: 10, count: 1 })
    expect(result.workingHours[11]).toEqual({ hour: 21, count: 12 })
    // 12 closed hours (0..9 and 22..23) each at 100
    expect(result.closedCount).toBe(12 * 100)
  })

  it('handles an all-zero input', () => {
    const result = bucketHours(Array(24).fill(0), bh)
    expect(result.workingHours).toHaveLength(12)
    expect(result.workingHours.every(w => w.count === 0)).toBe(true)
    expect(result.closedCount).toBe(0)
  })

  it('treats missing slots in a short array as 0', () => {
    const result = bucketHours([1, 2, 3], bh) // length 3
    expect(result.workingHours.every(w => w.count === 0)).toBe(true)
    // closed sum picks up the 3 leading values (all closed hours)
    expect(result.closedCount).toBe(6)
  })
})

describe('bucketHours - overnight window ordering', () => {
  const bh: BusinessHours = { open_hour: 18, close_hour: 2 }

  it('rotates working hours so they start at open_hour and wrap through midnight', () => {
    // Index = count for easy verification.
    const callsByHour = Array.from({ length: 24 }, (_, i) => i)
    const result = bucketHours(callsByHour, bh)

    expect(result.workingHours.map(w => w.hour)).toEqual([18, 19, 20, 21, 22, 23, 0, 1])
    expect(result.workingHours.map(w => w.count)).toEqual([18, 19, 20, 21, 22, 23, 0, 1])
    // closed = sum of hours 2..17
    const expectedClosed = Array.from({ length: 16 }, (_, i) => i + 2).reduce((a, b) => a + b, 0)
    expect(result.closedCount).toBe(expectedClosed)
  })
})
