// Per-segment diff between two VerifiedSegment-shaped arrays.
//
// Used by the three-column reviewer view (Commit 4) and the labeler
// suggestions view (Commit 5) to highlight which segments changed
// between machine -> labeler, labeler -> owner, or labeler-prior ->
// labeler-resolved.
//
// Algorithm: simple index alignment. result[i] reflects compared[i]
// vs baseline[i]. NOT Levenshtein, NOT longest-common-subsequence.
// Most labeler/owner edits happen in-place at the same index so this
// is enough at <100 segments per recording. Heavy reordering would
// flag more 'changed' than ideal but never wrong.

export type SegmentDiffStatus = 'unchanged' | 'changed' | 'inserted'

export interface SegmentDiffResult {
  // result.perSegmentStatus[i] is the status of compared[i] relative to
  // baseline[i] (or 'inserted' when i >= baseline.length).
  perSegmentStatus: SegmentDiffStatus[]
  // Indices in `baseline` that have no counterpart in `compared` (i.e.
  // compared.length < baseline.length). Renderable as ghost rows by the
  // consumer if desired.
  deletedBaselineIndices: number[]
}

// Accepts anything with the two diff-relevant fields. Lets callers pass
// VerifiedSegment or any superset without a type cast.
type DiffableSegment = {
  speaker_id: string
  transcript: string
}

export function diffSegments<T extends DiffableSegment>(
  baseline: readonly T[],
  compared: readonly T[],
): SegmentDiffResult {
  const perSegmentStatus: SegmentDiffStatus[] = []
  const deletedBaselineIndices: number[] = []

  for (let i = 0; i < compared.length; i++) {
    if (i >= baseline.length) {
      perSegmentStatus.push('inserted')
      continue
    }
    const a = baseline[i]
    const b = compared[i]
    if (a.transcript === b.transcript && a.speaker_id === b.speaker_id) {
      perSegmentStatus.push('unchanged')
    } else {
      perSegmentStatus.push('changed')
    }
  }

  for (let i = compared.length; i < baseline.length; i++) {
    deletedBaselineIndices.push(i)
  }

  return { perSegmentStatus, deletedBaselineIndices }
}

// Maps a per-segment diff status to a Tailwind class string suitable
// for the segment row's outer container. Empty for 'unchanged' so the
// row inherits its mode-driven styling. Commit 4 wires this in.
export function diffStatusToTailwindClass(
  status: SegmentDiffStatus,
): string {
  switch (status) {
    case 'unchanged':
      return ''
    case 'changed':
      return 'bg-yellow-50 border-l-2 border-yellow-400'
    case 'inserted':
      return 'bg-green-50 border-l-2 border-green-500'
  }
}
