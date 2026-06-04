import { describe, expect, it } from 'vitest'

import {
  forwardingCodeFor,
  CARRIER_LABELS,
  type Carrier,
} from '@/lib/forwarding-codes'

const FONO = '+12094376888'

describe('forwardingCodeFor', () => {
  it('returns unconditional codes for the live path', () => {
    expect(forwardingCodeFor('att', 'live', FONO)).toBe('*72*12094376888')
    expect(forwardingCodeFor('tmobile', 'live', FONO)).toBe('*21*12094376888#')
    expect(forwardingCodeFor('verizon', 'live', FONO)).toBe('*72 12094376888')
    expect(forwardingCodeFor('sprint', 'live', FONO)).toBe('*72 12094376888')
  })

  it('returns conditional codes for the voicemail path', () => {
    expect(forwardingCodeFor('att', 'voicemail', FONO)).toBe('**61*12094376888#')
    expect(forwardingCodeFor('tmobile', 'voicemail', FONO)).toBe('**61*12094376888#')
    expect(forwardingCodeFor('verizon', 'voicemail', FONO)).toBe('*71 12094376888')
    expect(forwardingCodeFor('sprint', 'voicemail', FONO)).toBe('*73 12094376888')
  })

  it('returns null for the "other" carrier on both paths', () => {
    expect(forwardingCodeFor('other', 'live', FONO)).toBeNull()
    expect(forwardingCodeFor('other', 'voicemail', FONO)).toBeNull()
  })

  it('strips a leading + from the E.164 fono number', () => {
    expect(forwardingCodeFor('att', 'live', '+12094376888')).toBe('*72*12094376888')
    // already-stripped input is left intact
    expect(forwardingCodeFor('att', 'live', '12094376888')).toBe('*72*12094376888')
  })

  it('has a human label for every carrier', () => {
    const carriers: Carrier[] = ['att', 'verizon', 'tmobile', 'sprint', 'other']
    for (const c of carriers) {
      expect(CARRIER_LABELS[c]).toBeTruthy()
    }
  })
})
