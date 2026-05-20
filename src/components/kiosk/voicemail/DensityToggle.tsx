'use client'

// T-228: card density toggle for the voicemail-route kiosk top bar. Three
// states - 1-up (single column), 2-up (two-column grid), List (compact
// rows). Sits at the right end of the horizontal binder strip row.
//
// Each button carries the shared `tap48` hit-area expander so the touch
// target is at least 48px even though the visible chip is sized to fit the
// 28px strip - matching how the spine theme toggle stays touch-friendly.

import { cn } from '@/lib/utils'
import styles from './styles.module.css'
import type { Density } from './types'

const OPTIONS: ReadonlyArray<{ value: Density; label: string }> = [
  { value: 'one', label: '1-up' },
  { value: 'two', label: '2-up' },
  { value: 'list', label: 'List' },
]

interface DensityToggleProps {
  value: Density
  onChange: (next: Density) => void
}

export function DensityToggle({ value, onChange }: DensityToggleProps) {
  return (
    <div
      className={styles.densityToggle}
      role="group"
      aria-label="Card density"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-active={value === opt.value ? 'true' : undefined}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(styles.tap48, styles.densityBtn)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
