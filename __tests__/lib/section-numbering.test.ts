import { describe, expect, it } from 'vitest'

import { displayNumberFor } from '@/lib/section-numbering'

describe('displayNumberFor', () => {
  it('returns null for any locked section regardless of path', () => {
    expect(displayNumberFor('connect', 'live', true)).toBeNull()
    expect(displayNumberFor('how-fono-answers', 'voicemail', true)).toBeNull()
    expect(displayNumberFor('categories', 'live', true)).toBeNull()
  })

  it('numbers the live path sections in order', () => {
    expect(displayNumberFor('connect', 'live', false)).toBe('01')
    expect(displayNumberFor('how-fono-answers', 'live', false)).toBe('02')
    expect(displayNumberFor('call-routing', 'live', false)).toBe('03')
    expect(displayNumberFor('categories', 'live', false)).toBe('04')
    expect(displayNumberFor('notifications', 'live', false)).toBe('05')
  })

  it('numbers the voicemail path sections, skipping call-routing', () => {
    expect(displayNumberFor('connect', 'voicemail', false)).toBe('01')
    expect(displayNumberFor('how-fono-answers', 'voicemail', false)).toBe('02')
    expect(displayNumberFor('categories', 'voicemail', false)).toBe('03')
    expect(displayNumberFor('notifications', 'voicemail', false)).toBe('04')
  })

  it('returns null for call-routing on the voicemail path (not applicable)', () => {
    expect(displayNumberFor('call-routing', 'voicemail', false)).toBeNull()
  })
})
