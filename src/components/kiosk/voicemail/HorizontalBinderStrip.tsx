'use client'

// Horizontal binder strip for the Layout C voicemail kiosk (v2.3) - the 28px
// strip across the top of the cards area. Hosts the three status tabs
// (New / Resolved / Hidden) with zero-padded mono count badges. Same gesture
// model as the spine: tap-to-flip plus press-and-drag-along-the-x-axis to
// scrub, with a thin Terra cursor-line tracking the pointer during a drag.

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import styles from './styles.module.css'
import { useBinderStrip, type BinderOption } from './useBinderStrip'
import type { Status } from './types'

interface HorizontalBinderStripProps {
  value: Status
  onChange: (s: Status) => void
  options: BinderOption<Status>[]
}

export function HorizontalBinderStrip({
  value,
  onChange,
  options,
}: HorizontalBinderStripProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const { dragging, dragPos, onPointerDown } = useBinderStrip(
    stripRef,
    options,
    value,
    onChange,
  )

  return (
    <div
      ref={stripRef}
      className={cn(styles.binderStrip, styles.binderStripH)}
      data-dragging={dragging ? 'true' : undefined}
      onPointerDown={onPointerDown('x')}
      role="tablist"
      aria-label="Voicemail status"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          data-s={opt.value}
          data-active={value === opt.value ? 'true' : undefined}
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={styles.bhtab}
        >
          <span className={styles.bhtabLabel}>{opt.label}</span>
          {opt.count != null ? (
            <span className={styles.bhtabCount}>
              {String(opt.count).padStart(2, '0')}
            </span>
          ) : null}
        </button>
      ))}
      {dragging && dragPos != null ? (
        <div
          aria-hidden="true"
          className={cn(styles.binderCursor, styles.binderCursorH)}
          style={{ left: `${dragPos}px` }}
        />
      ) : null}
    </div>
  )
}
