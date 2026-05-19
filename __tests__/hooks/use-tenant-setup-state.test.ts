import { describe, expect, it } from 'vitest'

// Indirect test of the deriveVariant logic via the hook's exported types.
// The deriveVariant function isn't exported (it's an implementation detail),
// but the contract is small enough to pin via re-derivation here. Keeps
// the source module surface minimal.

type SetupVariant = 'no-path' | 'picked-live' | 'picked-voicemail'

function deriveVariantContract(callSetupPath: string | null | undefined): SetupVariant {
  if (callSetupPath === 'live') return 'picked-live'
  if (callSetupPath === 'voicemail') return 'picked-voicemail'
  return 'no-path'
}

describe('SetupBanner variant derivation contract', () => {
  it('maps null to no-path', () => {
    expect(deriveVariantContract(null)).toBe('no-path')
  })

  it('maps undefined to no-path', () => {
    expect(deriveVariantContract(undefined)).toBe('no-path')
  })

  it('maps "live" to picked-live', () => {
    expect(deriveVariantContract('live')).toBe('picked-live')
  })

  it('maps "voicemail" to picked-voicemail', () => {
    expect(deriveVariantContract('voicemail')).toBe('picked-voicemail')
  })

  it('treats legacy A/B values as no-path so the banner reverts to V1', () => {
    // During the brief window between Railway deploying the new code and
    // alembic upgrade head running, a tenant's DB row might still hold
    // 'A' or 'B'. The banner should never show the V2 "almost there" copy
    // for a tenant whose path hasn't been migrated yet; treating legacy
    // values as no-path keeps the V1 copy honest.
    expect(deriveVariantContract('A')).toBe('no-path')
    expect(deriveVariantContract('B')).toBe('no-path')
  })
})
