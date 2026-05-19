// Palette A swatches (CD hand-off §3.2, M6 lock) and the chip tint
// derivation used wherever a category renders as a chip in v3.3.
//
// Chip tint formula (locked in M6):
//   background = swatch + 1A  (10% alpha)
//   border     = swatch + 40  (25% alpha)
//   dot        = swatch       (solid)
//
// Rotation walk lives on the backend: when a user adds a new category,
// PALETTE_A[next_unused_index] is the assignment. Deleted slots recycle
// at the end of the rotation order, so existing categories never
// re-color even after siblings are deleted.

export type PaletteASlot =
  | 'terra'
  | 'sage'
  | 'dusty-blue'
  | 'bone'
  | 'clay'
  | 'olive'
  | 'plum';

export const PALETTE_A: ReadonlyArray<{ slot: PaletteASlot; hex: string }> = [
  { slot: 'terra', hex: '#D4652C' },
  { slot: 'sage', hex: '#7B9C68' },
  { slot: 'dusty-blue', hex: '#4A6D86' },
  { slot: 'bone', hex: '#B0A090' },
  { slot: 'clay', hex: '#9C7B68' },
  { slot: 'olive', hex: '#866D4A' },
  { slot: 'plum', hex: '#7B6868' },
] as const;

export type ChipTint = {
  bg: string;
  border: string;
  dot: string;
};

const HEX_RE = /^#?([0-9a-f]{6})$/i;

function normaliseHex(swatch: string): string {
  const match = HEX_RE.exec(swatch.trim());
  if (!match) {
    throw new Error(
      `chipTint: expected a 6-digit hex string, got ${JSON.stringify(swatch)}`,
    );
  }
  return `#${match[1].toUpperCase()}`;
}

// Derive the three chip render colors from a single swatch hex.
// Accepts '#RRGGBB' or 'RRGGBB' (case-insensitive). Returns 8-digit
// hex (#RRGGBBAA) for bg and border so callers can drop the strings
// directly into inline style or CSS custom properties.
export function chipTint(swatch: string): ChipTint {
  const hex = normaliseHex(swatch);
  return {
    bg: `${hex}1A`,
    border: `${hex}40`,
    dot: hex,
  };
}

export function paletteSwatchAt(index: number): string {
  const slot = PALETTE_A[index % PALETTE_A.length];
  return slot.hex;
}

export function paletteSwatchFor(slot: PaletteASlot): string {
  const found = PALETTE_A.find((entry) => entry.slot === slot);
  if (!found) {
    throw new Error(`paletteSwatchFor: unknown slot ${JSON.stringify(slot)}`);
  }
  return found.hex;
}
