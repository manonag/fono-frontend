'use client'

import { useEffect, useRef } from 'react'
import { formatMmSs, truncate } from '../lib/formatters'
import type { QueueFilter, QueueItem } from '../lib/types'
import type { Status } from '../lib/enums'

interface QueuePaneProps {
  items: QueueItem[]
  total: number
  loading: boolean
  error: string | null
  filter: QueueFilter
  selectedId: string | null
  onFilterChange: (filter: QueueFilter) => void
  onSelect: (recordingId: string) => void
}

const FILTERS: Array<{ key: QueueFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'auto_labeled', label: 'Pending' },
  { key: 'in_review', label: 'In review' },
  { key: 'verified', label: 'Verified' },
  { key: 'gold', label: 'Gold' },
]

const STATUS_BADGE_CLS: Record<Status, string> = {
  auto_labeled: 'bg-brown/15 text-brown',
  in_review: 'bg-amber-100 text-amber-800',
  verified: 'bg-green-100 text-green-800',
  gold: 'bg-purple-100 text-purple-800',
}

const STATUS_BADGE_LABEL: Record<Status, string> = {
  auto_labeled: 'pending',
  in_review: 'review',
  verified: 'verified',
  gold: 'gold',
}

export function QueuePane({
  items,
  total,
  loading,
  error,
  filter,
  selectedId,
  onFilterChange,
  onSelect,
}: QueuePaneProps) {
  const selectedRowRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedId])

  return (
    <aside className="w-1/3 border-r border-ink/10 bg-white flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-ink/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-ink">Queue</h2>
          <span className="text-xs text-brown">
            {items.length} of {total}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => onFilterChange(f.key)}
                className={
                  active
                    ? 'px-2.5 py-1 rounded-full text-xs font-semibold bg-terra text-white'
                    : 'px-2.5 py-1 rounded-full text-xs font-medium bg-ink/5 text-ink hover:bg-ink/10'
                }
              >
                {f.label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {error && (
          <div className="m-3 p-2 rounded bg-red-100 text-red-800 text-xs">{error}</div>
        )}
        {loading && items.length === 0 && (
          <p className="text-brown text-sm p-4">Loading queue…</p>
        )}
        {!loading && items.length === 0 && !error && (
          <p className="text-brown text-sm p-4">No recordings match this filter.</p>
        )}
        <ul>
          {items.map((item, idx) => {
            const selected = item.recording_id === selectedId
            return (
              <li key={item.recording_id}>
                <button
                  ref={selected ? selectedRowRef : undefined}
                  type="button"
                  onClick={() => onSelect(item.recording_id)}
                  className={
                    selected
                      ? 'w-full text-left px-4 py-3 border-l-4 border-terra bg-cream'
                      : 'w-full text-left px-4 py-3 border-l-4 border-transparent hover:bg-ink/5'
                  }
                >
                  <div className="flex items-center gap-2 text-xs text-brown mb-1">
                    <span className="font-mono w-7">{(idx + 1).toString().padStart(3, ' ')}</span>
                    <span className="font-mono text-ink">
                      {formatMmSs(item.duration_seconds)}
                    </span>
                    <span className="truncate">{item.tenant_name}</span>
                    {item.is_holdout && (
                      <span className="ml-auto text-purple-700" title="Holdout candidate">★</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        STATUS_BADGE_CLS[item.status]
                      }`}
                    >
                      {STATUS_BADGE_LABEL[item.status]}
                    </span>
                    {item.sarvam_language_code && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-ink/5 text-ink">
                        {item.sarvam_language_code}
                      </span>
                    )}
                    {item.error_count > 0 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                        {item.error_count} err
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink leading-snug line-clamp-2">
                    {truncate(item.machine_transcript_preview, 120) || (
                      <span className="text-brown italic">no transcript</span>
                    )}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
