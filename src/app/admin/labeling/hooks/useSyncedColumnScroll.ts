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
   * Programmatically align all enabled-sync columns so the segment with
   * the given data-segment-index sits at the top. Gated on `enabled` per
   * architect re-decision: if the user has sync turned off, editing a
   * segment in one column should not move the others.
   */
  scrollToSegment: (index: number) => void
}

/**
 * Bidirectional scroll sync across the three transcript columns on the
 * reviewer / labeler-suggestions pages.
 *
 * When `enabled` is true, scrolling any column scrolls the other columns
 * to mirror the same segment + sub-segment offset. Lock is tight enough
 * that the three columns appear visually rigid even mid-scroll.
 *
 * Algorithm
 *
 *   1. On a real user scroll, find the FIRST segment in the source whose
 *      top is at or below the source column's content top. That segment
 *      is the anchor.
 *   2. Compute topOffset = anchorSeg.top - sourceColumn.top. Positive
 *      when the anchor segment has not yet reached the top (preceding
 *      segment is partially visible above); zero when the anchor is
 *      flush with the column top.
 *   3. For each OTHER column, locate the segment with the same data-
 *      segment-index. Adjust its column's scrollTop so the matching
 *      segment's top sits at columnTop + topOffset. The adjustment is
 *      column-relative: scrollTop += (currentDelta - desiredDelta).
 *   4. A 100ms ignore window suppresses re-entry while the programmatic
 *      scrolls settle. Real follow-up scrolls land outside the window.
 *
 * The sub-segment offset tracking is the difference from 5.7's
 * implementation, which only aligned segment boundaries and could
 * drift by up to one segment's height. With offset tracking the three
 * columns lock visually within a few pixels regardless of mid-segment
 * scroll position.
 */
export function useSyncedColumnScroll({
  enabled,
  columnRefs,
  segmentSelector = '[data-segment-index]',
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
      let anchorIndex = -1
      let topOffset = 0
      for (const seg of Array.from(segments)) {
        const segEl = seg as HTMLElement
        const segRect = segEl.getBoundingClientRect()
        if (segRect.top >= sourceRect.top) {
          // First segment whose top is at or below the source column top.
          const dataIdx = segEl.getAttribute('data-segment-index')
          if (dataIdx !== null) {
            const parsed = parseInt(dataIdx, 10)
            if (!Number.isNaN(parsed)) {
              anchorIndex = parsed
              topOffset = segRect.top - sourceRect.top
            }
          }
          break
        }
      }

      if (anchorIndex < 0) return

      setIgnoreWindow()
      alignOtherColumns(sourceIdx, anchorIndex, topOffset)
    }

    const alignOtherColumns = (
      sourceIdx: number,
      anchorIndex: number,
      topOffset: number,
    ) => {
      columnRefs.forEach((ref, otherIdx) => {
        if (otherIdx === sourceIdx) return
        const otherEl = ref.current
        if (!otherEl) return
        const targetSeg = otherEl.querySelector(
          `${segmentSelector}[data-segment-index="${anchorIndex}"]`,
        ) as HTMLElement | null
        if (!targetSeg) return
        const targetRect = targetSeg.getBoundingClientRect()
        const otherRect = otherEl.getBoundingClientRect()
        // Current top delta = targetRect.top - otherRect.top.
        // We want the delta to equal topOffset. Diff = current - desired.
        // Adding diff to scrollTop scrolls the column DOWN by that
        // amount (which moves content UP by that amount), so the
        // target segment moves UP toward the desired position.
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
    // columnRefs is a new array literal each render; the refs themselves
    // are stable across renders so closure-captured access works. Re-install
    // listeners only when sync flips or column count changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refsLength, segmentSelector])

  /**
   * Align every column to the given segment index with zero top offset
   * (segment top flush with column top). Used by the parent when a
   * segment enters edit mode so the other columns scroll to the same
   * segment for side-by-side comparison. Respects `enabled`: when sync
   * is off the user explicitly opted out, so editing must not move
   * other columns either.
   */
  const scrollToSegment = (index: number) => {
    if (!enabled) return
    columnRefs.forEach((ref) => {
      const container = ref.current
      if (!container) return
      const targetSeg = container.querySelector(
        `${segmentSelector}[data-segment-index="${index}"]`,
      ) as HTMLElement | null
      if (!targetSeg) return
      const containerRect = container.getBoundingClientRect()
      const targetRect = targetSeg.getBoundingClientRect()
      container.scrollTop += targetRect.top - containerRect.top
    })
  }

  return { scrollToSegment }
}
