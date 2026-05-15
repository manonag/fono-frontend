'use client'

// Drag-scrub gesture hook for the Layout C binder strips (v2.3).
//
// Both the vertical category spine and the horizontal status strip use this.
// Tap any tab to flip (the tabs carry their own onClick); press-and-drag
// along the strip's axis to scrub - as the pointer crosses each tab's slot
// that tab becomes active live, and the release stays where the finger ends
// up. A thin Terra cursor-line follows the pointer during a drag (rendered
// by the strip component from `dragPos`).
//
// Ported from the CD prototype kiosk-v2/layout-c.jsx lines 29-66, converted
// from JS to TS. Pointer-move / pointer-up / pointer-cancel listeners live on
// `window` so a drag that leaves the strip still tracks and still releases
// cleanly. `touch-action: none` on the strip (see styles.module.css) keeps
// the gesture from fighting native scroll; the card grid keeps its own
// scroll because it is a separate element.

import { useCallback, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'

export interface BinderOption<T extends string> {
  value: T
  label: string
  count?: number
}

interface UseBinderStripResult {
  dragging: boolean
  // Pointer offset along the strip's axis (px from the strip's top/left edge),
  // or null when not dragging. Drives the cursor-line position.
  dragPos: number | null
  onPointerDown: (axis: 'x' | 'y') => (e: ReactPointerEvent) => void
}

export function useBinderStrip<T extends string>(
  stripRef: RefObject<HTMLElement>,
  options: BinderOption<T>[],
  value: T,
  onChange: (next: T) => void,
): UseBinderStripResult {
  const [dragging, setDragging] = useState(false)
  const [dragPos, setDragPos] = useState<number | null>(null)

  // Map a pointer position to the tab slot under it and activate that tab.
  const handlePointer = useCallback(
    (e: PointerEvent, axis: 'x' | 'y') => {
      const strip = stripRef.current
      if (!strip) return
      const rect = strip.getBoundingClientRect()
      const along = axis === 'y' ? e.clientY - rect.top : e.clientX - rect.left
      const size = axis === 'y' ? rect.height : rect.width
      const slot = Math.max(
        0,
        Math.min(options.length - 1, Math.floor((along / size) * options.length)),
      )
      setDragPos(along)
      const next = options[slot].value
      if (next !== value) onChange(next)
    },
    [stripRef, options, value, onChange],
  )

  const onPointerDown = (axis: 'x' | 'y') => (e: ReactPointerEvent) => {
    // Only start a drag from the strip itself - never from an action that
    // happens to sit elsewhere on the page.
    if (!stripRef.current?.contains(e.target as Node)) return
    e.preventDefault()
    setDragging(true)
    handlePointer(e.nativeEvent, axis)
    const move = (ev: PointerEvent) => handlePointer(ev, axis)
    const up = () => {
      setDragging(false)
      setDragPos(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  return { dragging, dragPos, onPointerDown }
}
