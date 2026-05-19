// Brand color constants used by JS code paths that cannot reach for a
// Tailwind utility class (chart fills, inline style props on SVGs, etc).
// Tailwind tokens are the source of truth: see tailwind.config.ts.
//
// Palette A (T-229 formalization, M6 lock) lives alongside the brand
// chrome palette. paletteA[slot] is the canonical lookup; chipTint()
// in src/lib/palette.ts derives the chip render colors from a swatch.

export const colors = {
  terra: '#E0602A',
  terraDark: '#C84E20',
  cream: '#FDF0E8',
  ink: '#1E0E00',
  brown: '#8B7355',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
}

export const paletteA = {
  terra: '#D4652C',
  sage: '#7B9C68',
  dustyBlue: '#4A6D86',
  bone: '#B0A090',
  clay: '#9C7B68',
  olive: '#866D4A',
  plum: '#7B6868',
} as const
