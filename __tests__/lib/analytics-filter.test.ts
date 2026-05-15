import { describe, expect, it } from 'vitest'

import { resolveFilterWindow } from '@/lib/analytics-filter'

/**
 * The window math runs in the tenant's IANA TZ. The viewer's browser TZ
 * is the harness-default TZ for Node (typically UTC in CI), so any test
 * that relies on "now" depends on the current wall clock — we keep those
 * checks narrow (length, ISO formatting) and reserve numeric DST checks
 * for the `custom` filter where we control both ends.
 */

const LA = 'America/Los_Angeles'
const NY = 'America/New_York'
const UTC = 'UTC'

describe('resolveFilterWindow — custom range, tenant-TZ calendar day', () => {
  it('PT: a single calendar day is a 24h UTC window (PDT, UTC-7)', () => {
    const w = resolveFilterWindow(
      'custom',
      { from: '2026-05-14', to: '2026-05-14' },
      LA,
    )
    expect(w.startDate.toISOString()).toBe('2026-05-14T07:00:00.000Z')
    expect(w.endDate.toISOString()).toBe('2026-05-15T07:00:00.000Z')
    expect(w.endDate.getTime() - w.startDate.getTime()).toBe(24 * 3600 * 1000)
  })

  it('PT spring-forward (Mar 8 2026) yields a 23h UTC window', () => {
    const w = resolveFilterWindow(
      'custom',
      { from: '2026-03-08', to: '2026-03-08' },
      LA,
    )
    // PST → PDT at 02:00 local. Start is 00:00 PST = 08:00 UTC. Next
    // local midnight is 24h of wall-clock later but only 23h of real
    // time because the day "loses" an hour.
    expect(w.startDate.toISOString()).toBe('2026-03-08T08:00:00.000Z')
    expect(w.endDate.toISOString()).toBe('2026-03-09T07:00:00.000Z')
    expect(w.endDate.getTime() - w.startDate.getTime()).toBe(23 * 3600 * 1000)
  })

  it('PT fall-back (Nov 1 2026) yields a 25h UTC window', () => {
    const w = resolveFilterWindow(
      'custom',
      { from: '2026-11-01', to: '2026-11-01' },
      LA,
    )
    // PDT → PST at 02:00 local. Day "gains" an hour.
    expect(w.startDate.toISOString()).toBe('2026-11-01T07:00:00.000Z')
    expect(w.endDate.toISOString()).toBe('2026-11-02T08:00:00.000Z')
    expect(w.endDate.getTime() - w.startDate.getTime()).toBe(25 * 3600 * 1000)
  })

  it('ET vs PT differ by 3 hours on the same calendar date', () => {
    const pt = resolveFilterWindow(
      'custom',
      { from: '2026-05-14', to: '2026-05-14' },
      LA,
    )
    const et = resolveFilterWindow(
      'custom',
      { from: '2026-05-14', to: '2026-05-14' },
      NY,
    )
    // ET = UTC-4 (EDT) in May, PT = UTC-7. ET starts at 04:00 UTC, PT at 07:00.
    expect(pt.startDate.getTime() - et.startDate.getTime()).toBe(3 * 3600 * 1000)
    expect(pt.endDate.getTime() - et.endDate.getTime()).toBe(3 * 3600 * 1000)
  })

  it('UTC tenant has midnight-aligned UTC boundaries', () => {
    const w = resolveFilterWindow(
      'custom',
      { from: '2026-05-14', to: '2026-05-14' },
      UTC,
    )
    expect(w.startDate.toISOString()).toBe('2026-05-14T00:00:00.000Z')
    expect(w.endDate.toISOString()).toBe('2026-05-15T00:00:00.000Z')
  })

  it('multi-day custom range expands across calendar boundary', () => {
    const w = resolveFilterWindow(
      'custom',
      { from: '2026-05-13', to: '2026-05-14' },
      LA,
    )
    expect(w.startDate.toISOString()).toBe('2026-05-13T07:00:00.000Z')
    expect(w.endDate.toISOString()).toBe('2026-05-15T07:00:00.000Z')
    expect(w.daysInRange).toHaveLength(2)
  })
})

describe('resolveFilterWindow — pills', () => {
  it('today/yesterday are mutually exclusive (yesterday.end === today.start)', () => {
    const today = resolveFilterWindow('today', undefined, LA)
    const yesterday = resolveFilterWindow('yesterday', undefined, LA)
    expect(yesterday.endDate.toISOString()).toBe(today.startDate.toISOString())
  })

  it('yesterday is exactly one calendar day long in tenant TZ', () => {
    const yesterday = resolveFilterWindow('yesterday', undefined, LA)
    expect(yesterday.daysInRange).toHaveLength(1)
    const lengthMs = yesterday.endDate.getTime() - yesterday.startDate.getTime()
    // Either 23h, 24h, or 25h depending on whether yesterday was a DST
    // transition. Three valid lengths.
    expect([23, 24, 25].map(h => h * 3600 * 1000)).toContain(lengthMs)
  })

  it('today.start lands on PT midnight when tenant TZ is LA', () => {
    const today = resolveFilterWindow('today', undefined, LA)
    // The instant must format back to 00:00:00 in LA wall-clock.
    const ms = today.startDate.toLocaleString('en-US', {
      timeZone: LA,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    expect(ms.startsWith('00:00')).toBe(true)
  })

  it('different TZs produce different today.startDate', () => {
    const ptToday = resolveFilterWindow('today', undefined, LA)
    const utcToday = resolveFilterWindow('today', undefined, UTC)
    // PT and UTC midnight align only twice a year by accident; on any
    // other day they must differ.
    expect(ptToday.startDate.getTime()).not.toBe(utcToday.startDate.getTime())
  })

  it('week pill anchors on Monday in tenant TZ', () => {
    const w = resolveFilterWindow('week', undefined, LA)
    // startDate in tenant-TZ must be Monday (1) of the current week.
    const dow = parseInt(
      w.startDate.toLocaleString('en-US', { timeZone: LA, weekday: 'short' }) ===
        'Mon'
        ? '1'
        : '0',
      10,
    )
    expect(dow).toBe(1)
  })

  it('month pill anchors on day 1 in tenant TZ', () => {
    const w = resolveFilterWindow('month', undefined, LA)
    const day = w.startDate.toLocaleString('en-US', {
      timeZone: LA,
      day: 'numeric',
    })
    expect(day).toBe('1')
  })

  it('labels render in tenant TZ regardless of browser TZ', () => {
    const w = resolveFilterWindow(
      'custom',
      { from: '2026-05-14', to: '2026-05-14' },
      LA,
    )
    // The window straddles 14 May (LA) / 14-15 May (UTC). Label is built
    // from the tenant-TZ formatting path so it should always say May 14.
    expect(w.label).toContain('May 14, 2026')
  })
})
