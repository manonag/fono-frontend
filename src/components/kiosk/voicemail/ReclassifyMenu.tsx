'use client'

// One-tap reclassify popover for the voicemail-route kiosk (Direction A).
// A popover, not a modal: absolutely positioned below the intent stamp.
// One tap on any option commits and closes - no confirmation step. Tapping
// the close button, outside the popover, or Escape cancels. Ported from
// design_handoff_voicemail_kiosk common.jsx; outside-click + Escape close
// added per the CD README "Screen 3" interaction spec.

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { IconClose } from './icons'
import styles from './styles.module.css'
import type { Category, IntentKey } from './types'

interface ReclassifyMenuProps {
  open: boolean
  current: IntentKey | null
  categories: Category[]
  onPick: (key: IntentKey) => void
  onClose: () => void
}

export function ReclassifyMenu({
  open,
  current,
  categories,
  onPick,
  onClose,
}: ReclassifyMenuProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={popoverRef}
      // Taps inside the popover must not bubble to the card body and fold it.
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Reclassify intent"
      className={cn(
        'absolute left-0 top-[calc(100%+4px)] z-20 w-80',
        'rounded-lg border border-rcp-popover-border bg-rcp-popover-bg shadow-rcp-popover',
        'px-3.5 pb-2.5 pt-3',
      )}
    >
      <div className="mb-2 flex items-center justify-between border-b border-dashed border-rcp-rule pb-2 font-rcp-mono text-[10px] uppercase tracking-[0.12em] text-rcp-brown">
        <span>Reclassify intent</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={cn(
            styles.tap48,
            'inline-flex h-6 w-6 items-center justify-center rounded text-rcp-brown hover:bg-rcp-stamp-hover',
          )}
        >
          <IconClose w={14} h={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {categories.map((c) => {
          const isCurrent = c.key === current
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onPick(c.key)}
              className={cn(
                'flex min-h-[48px] flex-col items-start gap-0.5 rounded-md border px-2.5 py-2 text-left',
                isCurrent
                  ? 'border-rcp-terra-warm bg-rcp-terra-tint'
                  : 'border-rcp-rule hover:border-rcp-terra-warm hover:bg-rcp-terra-tint-soft',
              )}
            >
              <span className="font-rcp-mono text-[10px] tracking-[0.02em] text-rcp-brown">
                [{c.key}]
              </span>
              <span className="text-[13px] font-semibold text-rcp-text-strong">
                {c.display}
              </span>
              {isCurrent ? (
                <span className="font-rcp-mono text-[9px] uppercase tracking-[0.1em] text-rcp-terra-dark">
                  current
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mt-2 border-t border-dashed border-rcp-rule pt-2 font-rcp-mono text-[10px] tracking-[0.04em] text-rcp-brown">
        One tap retrains the model.
      </div>
    </div>
  )
}
