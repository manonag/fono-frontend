import { describe, expect, it } from 'vitest'

import {
  PALETTE_A,
  chipTint,
  paletteSwatchAt,
  paletteSwatchFor,
} from '@/lib/palette'

describe('PALETTE_A', () => {
  it('exposes the 7 v3.3 M6-locked swatches in order', () => {
    expect(PALETTE_A.map((entry) => entry.slot)).toEqual([
      'terra',
      'sage',
      'dusty-blue',
      'bone',
      'clay',
      'olive',
      'plum',
    ])
  })

  it('uses the palette terra (#D4652C), not brand terra (#E0602A)', () => {
    expect(PALETTE_A[0]).toEqual({ slot: 'terra', hex: '#D4652C' })
  })
})

describe('chipTint', () => {
  it('derives bg/border/dot from a single hex per CD §3.2', () => {
    expect(chipTint('#D4652C')).toEqual({
      bg: '#D4652C1A',
      border: '#D4652C40',
      dot: '#D4652C',
    })
  })

  it('normalises lowercase hex and missing # prefix', () => {
    expect(chipTint('7b9c68')).toEqual({
      bg: '#7B9C681A',
      border: '#7B9C6840',
      dot: '#7B9C68',
    })
  })

  it('throws on malformed input', () => {
    expect(() => chipTint('not-a-color')).toThrow()
    expect(() => chipTint('#FFF')).toThrow()
    expect(() => chipTint('')).toThrow()
  })
})

describe('paletteSwatchAt', () => {
  it('returns the hex at the given rotation index', () => {
    expect(paletteSwatchAt(0)).toBe('#D4652C')
    expect(paletteSwatchAt(3)).toBe('#B0A090')
  })

  it('wraps modulo PALETTE_A.length so the rotation never runs out', () => {
    expect(paletteSwatchAt(7)).toBe(paletteSwatchAt(0))
    expect(paletteSwatchAt(14)).toBe(paletteSwatchAt(0))
  })
})

describe('paletteSwatchFor', () => {
  it('looks up a swatch by its slot name', () => {
    expect(paletteSwatchFor('dusty-blue')).toBe('#4A6D86')
    expect(paletteSwatchFor('plum')).toBe('#7B6868')
  })
})
