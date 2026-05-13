'use client'

import { useEffect } from 'react'

interface ColumnRef {
  current: HTMLDivElement | null
}

interface UseSyncedColumnScrollOptions {
  enabled: boolean
  columnRefs: ColumnRef[]
  segmentSelector?: string
}

interface UseSyncedColumnScrollReturn {
  /**
   * Programmatically align all enabled-sync columns so the segment at
   * the given index in the source column drives a timestamp-based
   * lookup; every other column scrolls so the segment matching that
   * timestamp sits at the top. Gated on `enabled` per architect:
   * if the user has sync off, editing must not move other columns.
   */
  scrollToSegment: (sourceColumnIdx: number, segmentIndex: number) => void
}

/**
 * Bidirectional scroll sync across transcript columns on the reviewer
 * and labeler-suggestions pages.
 *
 * Alignment key: start_time_seconds (NOT array index). Different
 * columns can have divergent segment arrays (owner inserts/deletes/
 * splits segments in their working copy) but the audio is the same,
 * so timestamps identify "the same moment in the conversation." This
 * is the 5.8.1 fix on top of 5.8's index-based alignment.
 *
 * Algorithm
 *
 *   1. On scroll, find the source column's anchor segment (first whose
 *      top is at or below the column's content top). Compute the
 *      sub-segment topOffset (positive when preceding segment is still
 *      partially visible above the anchor).
 *   2. Read the anchor's data-segment-start to get its audio timestamp.
 *   3. For each OTHER column, locate the segment whose
 *      [start_time, end_time] interval contains that timestamp
 *      (preferred). If none does, fall back to the segment whose
 *      start_time is closest to the source's. This gracefully handles
 *      inserted, deleted, or split segments.
 *   4. Scroll the target column so the matching segment's top sits at
 *      columnTop + same topOffset, preserving sub-segment scroll feel.
 *   5. A 100ms ignore window prevents the programmatic scrolls from
 *      cascading.
 *
 * For edit-trigger sync (Bug 2 from 5.8), scrollToSegment looks up
 * the source segment's timestamp via data-segment-start, then aligns
 * other columns with zero topOffset (flush at column top).
 */
export function useSyncedColumnScroll({
  enabled,
  columnRefs,
  segmentSelector = '[data-segment-start]',
}: UseSyncedColumnScrollOptions): UseSyncedColumnScrollReturn {
  const refsLength = columnRefs.length

  useEffect(() => {
    if (!enabled) return

    let ignoring = false
    let ignoreTimeout: ReturnType<typeof setTimeout> | null = null

    const setIgnoreWindow = () => {
      ignoring = true
      if (ignoreTimeout) clearTimeout(ignoreTimeout)
      ignoreTimeout = setTimeout(() => {
        ignoring = false
      }, 100)
    }

    const handleScroll = (sourceIdx: number) => {
      if (ignoring) return
      const sourceEl = columnRefs[sourceIdx]?.current
      if (!sourceEl) return

      const segments = sourceEl.querySelectorAll(segmentSelector)
      if (segments.length === 0) return

      const sourceRect = sourceEl.getBoundingClientRect()
      let anchorEl: HTMLElement | null = null
      let topOffset = 0
      for (const seg of Array.from(segments)) {
        const segEl = seg as HTMLElement
        const segRect = segEl.getBoundingClientRect()
        if (segRect.top >= sourceRect.top) {
          anchorEl = segEl
          topOffset = segRect.top - sourceRect.top
          break
        }
      }
      if (!anchorEl) return

      const anchorStart = parseFloat(
        anchorEl.getAttribute('data-segment-start') ?? 'NaN',
      )
      if (Number.isNaN(anchorStart)) return

      setIgnoreWindow()

      columnRefs.forEach((ref, otherIdx) => {
        if (otherIdx === sourceIdx) return
        const otherEl = ref.current
        if (!otherEl) return
        const matchingSeg = findSegmentByTime(otherEl, anchorStart)
        if (!matchingSeg) return
        const targetRect = matchingSeg.getBoundingClientRect()
        const otherRect = otherEl.getBoundingClientRect()
        otherEl.scrollTop += targetRect.top - otherRect.top - topOffset
      })
    }

    const cleanupFns: Array<() => void> = []
    columnRefs.forEach((ref, idx) => {
      const el = ref.current
      if (!el) return
      const fn = () => handleScroll(idx)
      el.addEventListener('scroll', fn, { passive: true })
      cleanupFns.push(() => el.removeEventListener('scroll', fn))
    })

    return () => {
      cleanupFns.forEach((fn) => fn())
      if (ignoreTimeout) clearTimeout(ignoreTimeout)
    }
    // columnRefs is a new array literal each render; refs themselves are
    // stable across renders so closure-captured access works. Re-install
    // listeners only on enabled flip or column count change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refsLength, segmentSelector])

  /**
   * Align every column to the segment matching the timestamp of
   * `segmentIndex` in `sourceColumnIdx`'s column. Used by the parent
   * when a segment enters edit mode. Skips the source column (the
   * user is already there). Aligns matched segments flush with the
   * column top (zero offset). Respects `enabled`.
   */
  const scrollToSegment = (sourceColumnIdx: number, segmentIndex: number) => {
    if (!enabled) return
    const sourceContainer = columnRefs[sourceColumnIdx]?.current
    if (!sourceContainer) return
    const sourceSeg = sourceContainer.querySelector(
      `[data-segment-index="${segmentIndex}"]`,
    ) as HTMLElement | null
    if (!sourceSeg) return
    const startTime = parseFloat(
      sourceSeg.getAttribute('data-segment-start') ?? 'NaN',
    )
    if (Number.isNaN(startTime)) return

    columnRefs.forEach((ref, idx) => {
      if (idx === sourceColumnIdx) return
      const targetContainer = ref.current
      if (!targetContainer) return
      const matchingSeg = findSegmentByTime(targetContainer, startTime)
      if (!matchingSeg) return
      const containerRect = targetContainer.getBoundingClientRect()
      const segmentRect = matchingSeg.getBoundingClientRect()
      targetContainer.scrollTop += segmentRect.top - containerRect.top
    })
  }

  return { scrollToSegment }
}

/**
 * Locate the segment in `container` that best matches `targetStart`
 * (audio timestamp in seconds).
 *
 *   1. Prefer a segment whose [start_time, end_time] interval contains
 *      the target. That's "the segment playing at this moment."
 *   2. Otherwise return the segment whose start_time is closest to
 *      the target. Handles inserted/deleted/split segments gracefully
 *      across columns with divergent arrays.
 */
function findSegmentByTime(
  container: HTMLElement,
  targetStart: number,
): HTMLElement | null {
  const segments = Array.from(
    container.querySelectorAll('[data-segment-start]'),
  ) as HTMLElement[]
  if (segments.length === 0) return null

  for (const seg of segments) {
    const start = parseFloat(seg.getAttribute('data-segment-start') ?? 'NaN')
    const end = parseFloat(seg.getAttribute('data-segment-end') ?? 'NaN')
    if (Number.isNaN(start) || Number.isNaN(end)) continue
    if (start <= targetStart && targetStart <= end) return seg
  }

  let closest: HTMLElement | null = null
  let closestDist = Infinity
  for (const seg of segments) {
    const start = parseFloat(seg.getAttribute('data-segment-start') ?? 'NaN')
    if (Number.isNaN(start)) continue
    const dist = Math.abs(start - targetStart)
    if (dist < closestDist) {
      closestDist = dist
      closest = seg
    }
  }
  return closest
}
