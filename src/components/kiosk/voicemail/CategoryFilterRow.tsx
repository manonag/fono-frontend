'use client'

// Category filter chips + sort toggle for the voicemail-route kiosk
// (Direction A - receipt). Chip labels come from tenant.categories[] at
// render time (never hardcoded); intent_category_key is used for matching.
// Shown on the New tab only. Ported from design_handoff_voicemail_kiosk.

import { cn } from '@/lib/utils'
import { IconSwap } from './icons'
import styles from './styles.module.css'
import type { Category, CategoryFilter, SortOrder } from './types'

interface CategoryFilterRowProps {
  value: CategoryFilter
  onChange: (value: CategoryFilter) => void
  categories: Category[]
  sort: SortOrder
  onSortChange: (sort: SortOrder) => void
}

interface ChipProps {
  active: boolean
  chipKey: string
  label: string
  onClick: () => void
}

function Chip({ active, chipKey, label, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        styles.tap48,
        'inline-flex min-h-[36px] items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-medium',
        active
          ? 'border-solid border-rcp-chip-active-bg bg-rcp-chip-active-bg text-rcp-chip-active-fg'
          : 'border-dashed border-rcp-rule text-rcp-cocoa hover:border-solid hover:border-rcp-brown',
      )}
    >
      <span
        className={cn(
          'font-rcp-mono text-[11px] tracking-[0.03em]',
          active ? 'text-rcp-chip-active-key' : 'text-rcp-brown',
        )}
      >
        [{chipKey}]
      </span>
      <span>{label}</span>
    </button>
  )
}

export function CategoryFilterRow({
  value,
  onChange,
  categories,
  sort,
  onSortChange,
}: CategoryFilterRowProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-1.5 pt-3.5">
      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-1.5">
        <Chip
          active={value === 'all'}
          chipKey="all"
          label="Everything"
          onClick={() => onChange('all')}
        />
        {categories.map((c) => (
          <Chip
            key={c.key}
            active={value === c.key}
            chipKey={c.key}
            label={c.display}
            onClick={() => onChange(c.key)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => onSortChange(sort === 'newest' ? 'oldest' : 'newest')}
        title="Toggle sort order"
        className={cn(
          styles.tap48,
          'inline-flex items-center gap-1.5 px-1 py-2 font-rcp-mono text-[11px] uppercase tracking-[0.04em] text-rcp-brown hover:text-rcp-ink',
        )}
      >
        <IconSwap w={12} h={12} />
        {sort === 'newest' ? 'newest first' : 'oldest first'}
      </button>
    </div>
  )
}
