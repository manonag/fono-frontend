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

/**
 * Bidirectional scroll sync across the three transcript columns on the
 * reviewer / labeler-suggestions pages.
 *
 * When `enabled` is true, scrolling any column scrolls the other columns
 * so the segment at the top of the source column is also at the top of
 * every other column. Segments are identified by data-segment-index.
 *
 * Implementation notes
 *
 *   1. We listen for scroll events on each column's scrollable container.
 *   2. On a real user scroll, we find the first segment whose top is at
 *      or below the column's content top (with a small slack). That
 *      segment's data-segment-index is the alignment target.
 *   3. We programmatically scroll the OTHER columns so their matching
 *      segment lines up at the top. The active-segment scrollIntoView
 *      logic inside TranscriptColumn uses block: 'center', which lives
 *      alongside this hook fine because the guard flag below prevents
 *      a programmatic scroll from cascading.
 *   4. A 100ms ignore window suppresses re-entry while the programmatic
 *      scrolls settle. Real follow-up scrolls land outside the window.
 */
export function useSyncedColumnScroll({
  enabled,
  columnRefs,
  segmentSelector = '[data-segment-index]',
}: UseSyncedColumnScrollOptions): void {
  // columnRefs identity changes per render in the parent (array literal),
  // so depend on length and `enabled` only. Refs themselves are stable.
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
      let visibleIndex = -1
      for (const seg of Array.from(segments)) {
        const segRect = (seg as HTMLElement).getBoundingClientRect()
        if (segRect.top >= sourceRect.top - 20) {
          const dataIdx = (seg as HTMLElement).getAttribute('data-segment-index')
          if (dataIdx !== null) {
            visibleIndex = parseInt(dataIdx, 10)
          }
          break
        }
      }

      if (visibleIndex < 0 || Number.isNaN(visibleIndex)) return

      setIgnoreWindow()

      columnRefs.forEach((ref, otherIdx) => {
        if (otherIdx === sourceIdx) return
        const otherEl = ref.current
        if (!otherEl) return
        const targetSeg = otherEl.querySelector(
          `${segmentSelector}[data-segment-index="${visibleIndex}"]`,
        )
        if (!targetSeg) return
        const targetRect = (targetSeg as HTMLElement).getBoundingClientRect()
        const otherRect = otherEl.getBoundingClientRect()
        // Adjust scrollTop so the target segment's top aligns with the
        // column's content top. scrollIntoView({block: 'start'}) would
        // also work but can scroll ancestor containers; setting scrollTop
        // directly stays within the column.
        otherEl.scrollTop += targetRect.top - otherRect.top
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
    // columnRefs is intentionally not in the dep array (it's a new array
    // literal each render). The hook re-installs when enabled flips or
    // when the number of columns changes; the refs themselves are stable
    // useRef returns from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refsLength, segmentSelector])
}
