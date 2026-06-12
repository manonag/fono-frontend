import { describe, expect, it } from 'vitest'

import { canLabelerSwap, ownsClaim } from '@/app/admin/labeling/lib/claim-ownership'

// Sprint 1 escape hotfix: Swap all speakers must be enabled when the labeler
// holds the claim, disabled when the recording is unclaimed or claimed by
// someone else. Pins that logic so the legacy-lock regression cannot return.

describe('ownsClaim', () => {
  it('is true when the claim holder is the current user', () => {
    expect(ownsClaim('u1', 'u1')).toBe(true)
  })
  it('is false when unclaimed', () => {
    expect(ownsClaim(null, 'u1')).toBe(false)
  })
  it('is false when claimed by another user', () => {
    expect(ownsClaim('u2', 'u1')).toBe(false)
  })
  it('is false when there is no current user', () => {
    expect(ownsClaim('u1', null)).toBe(false)
  })
})

describe('canLabelerSwap', () => {
  const base = { claimedByUserId: 'u1', currentUserId: 'u1', busy: false }

  it('enabled when claimed-by-me, not busy', () => {
    expect(canLabelerSwap(base)).toBe(true)
  })
  it('disabled when unclaimed', () => {
    expect(canLabelerSwap({ ...base, claimedByUserId: null })).toBe(false)
  })
  it('disabled when claimed by another user', () => {
    expect(canLabelerSwap({ ...base, claimedByUserId: 'u2' })).toBe(false)
  })
  it('disabled while another action is in flight', () => {
    expect(canLabelerSwap({ ...base, busy: true })).toBe(false)
  })
})
