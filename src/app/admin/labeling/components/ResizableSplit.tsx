'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ResizableSplitProps {
  left: ReactNode
  right: ReactNode
  /** Pixels (number) or CSS string like "33%". Default '50%'. */
  initialLeftWidth?: number | string
  /** Minimum width in pixels for either pane. Default 200. */
  minWidth?: number
  /** Maximum width of the left pane as a fraction of total. Default 0.6. */
  maxFraction?: number
  /** Extra Tailwind classes applied to the outer container; use to grant
   * height (flex-1 min-h-0, h-full, etc.) since the split itself does not
   * set vertical sizing. */
  className?: string
  /** Extra classes on the drag handle. */
  handleClassName?: string
}

/**
 * Horizontal two-pane split with a draggable resize handle.
 *
 * The component sets up:
 *   - A flex-row container that takes width from the className (callers
 *     decide the height via flex-1 / h-full / etc. on the parent).
 *   - Left pane: explicit pixel width once measured, flex-shrink: 0 so
 *     it does not collapse when the inner content tries to grow.
 *   - Handle: 6px wide vertical bar with cursor: col-resize. Highlights
 *     terra on hover, terra-dark while dragging. Document-level mouse
 *     listeners installed for the duration of the drag so the cursor
 *     can wander off the handle and still drive resize.
 *   - Right pane: flex-1 min-w-0 to fill remaining width.
 *
 * Both panes are themselves flex-col containers so children that rely on
 * flex-1 for vertical sizing (e.g. ReviewPane's main element) keep
 * working when wrapped.
 *
 * For three-column layouts, nest two splits: outer with the left column
 * on the left, inner with the middle + right columns split inside the
 * outer's right pane. Each split measures its own container width.
 *
 * Constraints: left width clamped to [minWidth, container * maxFraction]
 * and additionally to (container - minWidth) so the right pane never
 * drops below minWidth either.
 */
export function ResizableSplit({
  left,
  right,
  initialLeftWidth = '50%',
  minWidth = 200,
  maxFraction = 0.6,
  className = '',
  handleClassName = '',
}: ResizableSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftWidth, setLeftWidth] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Resolve the initial width once the container is mounted and has a
  // measurable width. After that, dragging owns leftWidth.
  useEffect(() => {
    if (!containerRef.current || leftWidth !== null) return
    const containerWidth = containerRef.current.offsetWidth
    if (containerWidth <= 0) return
    let initial: number
    if (typeof initialLeftWidth === 'number') {
      initial = initialLeftWidth
    } else if (initialLeftWidth.endsWith('%')) {
      const pct = parseFloat(initialLeftWidth)
      initial = Math.round(containerWidth * (pct / 100))
    } else {
      initial = parseFloat(initialLeftWidth) || Math.round(containerWidth / 2)
    }
    setLeftWidth(initial)
  }, [initialLeftWidth, leftWidth])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const containerEl = containerRef.current
      if (!containerEl) return
      const rect = containerEl.getBoundingClientRect()
      const totalWidth = rect.width
      const proposed = e.clientX - rect.left
      const minLeft = minWidth
      const maxLeftByFraction = totalWidth * maxFraction
      const maxLeftByRightMin = totalWidth - minWidth
      const clamped = Math.max(
        minLeft,
        Math.min(proposed, maxLeftByFraction, maxLeftByRightMin),
      )
      setLeftWidth(clamped)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    const prevCursor = document.body.style.cursor
    const prevSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = prevCursor
      document.body.style.userSelect = prevSelect
    }
  }, [isDragging, maxFraction, minWidth])

  const leftStyle =
    leftWidth !== null
      ? { width: `${leftWidth}px`, flexShrink: 0 as const }
      : { width: initialLeftWidth as string, flexShrink: 0 as const }

  return (
    <div ref={containerRef} className={`flex w-full min-w-0 ${className}`}>
      <div style={leftStyle} className="flex flex-col min-w-0">
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={() => setIsDragging(true)}
        className={`w-1.5 cursor-col-resize transition-colors ${
          isDragging ? 'bg-terra-dark' : 'bg-ink/10 hover:bg-terra'
        } ${handleClassName}`}
      />
      <div className="flex-1 min-w-0 flex flex-col">{right}</div>
    </div>
  )
}
