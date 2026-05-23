'use client'

import { formatMmSs, truncate } from '../lib/formatters'
import type { AdjudicationRow, QueueFilterChip } from './lib/types'

interface AdjudicateQueuePaneProps {
  rows: AdjudicationRow[]
  filteredRows: AdjudicationRow[]
  chipCounts: Record<QueueFilterChip, number>
  filter: QueueFilterChip
  selectedRowId: string | null
  loading: boolean
  error: string | null
  onFilterChange: (next: QueueFilterChip) => void
  onSelect: (rowId: string) => void
}

const CHIP_LABELS: Record<QueueFilterChip, string> = {
  all: 'All',
  PROMPT: 'Prompt',
  CONTESTABLE_GOLD: 'Gold?',
  BOUNDARY: 'Boundary',
  unruled: 'Unruled',
}

const TAG_STYLES: Record<string, string> = {
  PROMPT: 'bg-danger/15 text-danger',
  CONTESTABLE_GOLD: 'bg-warning/20 text-ink',
  BOUNDARY: 'bg-ink/10 text-brown',
}

function TagBadge({ tag }: { tag: string }) {
  if (!tag) return null
  const cls = TAG_STYLES[tag] ?? 'bg-ink/10 text-brown'
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {tag}
    </span>
  )
}

function RuledBadge() {
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-green-100 text-green-800">
      ruled
    </span>
  )
}

const CHIP_ORDER: QueueFilterChip[] = [
  'all',
  'PROMPT',
  'CONTESTABLE_GOLD',
  'BOUNDARY',
  'unruled',
]

export function AdjudicateQueuePane({
  rows,
  filteredRows,
  chipCounts,
  filter,
  selectedRowId,
  loading,
  error,
  onFilterChange,
  onSelect,
}: AdjudicateQueuePaneProps) {
  return (
    <aside className="h-full w-full border-r border-ink/10 bg-white flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-ink/10">
        <div className="flex flex-wrap gap-1.5">
          {CHIP_ORDER.map((chip) => {
            const active = filter === chip
            const count = chipCounts[chip] ?? 0
            return (
              <button
                key={chip}
                type="button"
                onClick={() => onFilterChange(chip)}
                className={
                  active
                    ? 'px-2.5 py-1 rounded-full text-xs font-semibold bg-ink text-cream'
                    : 'px-2.5 py-1 rounded-full text-xs font-medium bg-ink/5 text-ink hover:bg-ink/10'
                }
              >
                {CHIP_LABELS[chip]} {count}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {error && (
          <div className="m-3 p-2 rounded bg-red-100 text-red-800 text-xs">
            {error}
          </div>
        )}
        {loading && rows.length === 0 && (
          <p className="text-brown text-sm p-4">Loading rows...</p>
        )}
        {!loading && filteredRows.length === 0 && !error && (
          <p className="text-brown text-sm p-4">No rows match this filter.</p>
        )}
        <ul>
          {filteredRows.map((row) => {
            const selected = row.row_id === selectedRowId
            const goldLabel = row.gold || '?'
            const predLabel = row.predicted || '?'
            return (
              <li key={row.row_id}>
                <button
                  type="button"
                  onClick={() => onSelect(row.row_id)}
                  className={
                    selected
                      ? 'w-full text-left px-4 py-3 border-l-4 border-terra bg-cream'
                      : 'w-full text-left px-4 py-3 border-l-4 border-transparent hover:bg-ink/5'
                  }
                >
                  <div className="flex items-center gap-2 text-xs text-brown mb-1">
                    <span className="font-mono text-ink">{row.display_id}</span>
                    <span className="font-mono">
                      {row.duration != null ? formatMmSs(row.duration) : '-:--'}
                    </span>
                    <TagBadge tag={row.tag} />
                    {row.ruling && <RuledBadge />}
                  </div>
                  <p className="text-xs text-brown leading-snug line-clamp-2 mb-1">
                    {truncate(row.transcript, 120) || (
                      <span className="italic">no transcript</span>
                    )}
                  </p>
                  <div className="text-[10px] font-mono text-brown">
                    {goldLabel} {'->'} {predLabel}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
