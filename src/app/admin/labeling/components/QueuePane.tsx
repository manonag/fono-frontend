'use client'

import { useEffect, useRef, useState } from 'react'
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
  currentUserId: string | null
  onFilterChange: (filter: QueueFilter) => void
  onSelect: (recordingId: string) => void
  // T-2d16e333: per-row recovery demote action. Parent issues a PATCH
  // scoped to the given recording_id, independent of the currently
  // selected row. Demote target depends on row status: verified ->
  // auto_labeled (Send back to Pending), gold -> verified (Demote).
  onDemote: (
    recordingId: string,
    target: 'auto_labeled' | 'verified',
  ) => Promise<{ ok: boolean; error?: string }>
}

const FILTERS: Array<{ key: QueueFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'auto_labeled', label: 'Pending' },
  { key: 'in_review', label: 'In review' },
  { key: 'suggestions_pending', label: 'Suggestions' },
  { key: 'verified', label: 'Verified' },
  { key: 'gold', label: 'Gold' },
]

const STATUS_BADGE_CLS: Record<Status, string> = {
  auto_labeled: 'bg-brown/15 text-brown',
  in_review: 'bg-amber-100 text-amber-800',
  suggestions_pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  gold: 'bg-purple-100 text-purple-800',
}

const STATUS_BADGE_LABEL: Record<Status, string> = {
  auto_labeled: 'pending',
  in_review: 'review',
  suggestions_pending: 'suggestions',
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
  currentUserId,
  onFilterChange,
  onSelect,
  onDemote,
}: QueuePaneProps) {
  const selectedRowRef = useRef<HTMLButtonElement | null>(null)
  // T-2d16e333: id of the row whose overflow menu is open (null = none).
  // Click-elsewhere on the document closes the menu.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [demotingId, setDemotingId] = useState<string | null>(null)
  const menuContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (selectedRowRef.current) {
      selectedRowRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedId])

  useEffect(() => {
    if (openMenuId === null) return
    const onDocClick = (e: MouseEvent) => {
      const el = menuContainerRef.current
      if (el && !el.contains(e.target as Node)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openMenuId])

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
            const lockedByOther =
              item.lock_holder_user_id !== null &&
              item.lock_holder_user_id !== currentUserId
            // T-2d16e333: recovery action available on verified / gold rows.
            const demoteTarget: 'auto_labeled' | 'verified' | null =
              item.status === 'verified'
                ? 'auto_labeled'
                : item.status === 'gold'
                  ? 'verified'
                  : null
            const demoteLabel =
              demoteTarget === 'auto_labeled'
                ? 'Send back to Pending'
                : 'Demote to Verified'
            const menuOpen = openMenuId === item.recording_id
            const rowDemoting = demotingId === item.recording_id
            return (
              <li key={item.recording_id} className="relative group">
                <button
                  ref={selected ? selectedRowRef : undefined}
                  type="button"
                  onClick={() => onSelect(item.recording_id)}
                  disabled={lockedByOther}
                  title={
                    lockedByOther
                      ? `Locked by ${item.lock_holder_name ?? 'another labeler'}`
                      : undefined
                  }
                  className={
                    selected
                      ? 'w-full text-left px-4 py-3 border-l-4 border-terra bg-cream'
                      : lockedByOther
                        ? 'w-full text-left px-4 py-3 border-l-4 border-transparent opacity-60 cursor-not-allowed'
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                    {lockedByOther && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                        🔒 {item.lock_holder_name ?? 'someone'} is labeling
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink leading-snug line-clamp-2">
                    {/* T-2d16e333 followup: show verified-edited preview
                        when available so labeler/owner work is visible
                        in the queue list. auto_labeled rows always show
                        machine output (the verified text from a prior
                        verification stays in the DB after Send back to
                        Pending, but the row is back to needing work, so
                        the machine snippet is the right anchor). in_review
                        rows DO surface the labeler-edited preview: their
                        work is what's relevant in the list, not the
                        machine output it replaced. */}
                    {truncate(
                      item.status === 'auto_labeled' || !item.verified_transcript_preview
                        ? item.machine_transcript_preview
                        : item.verified_transcript_preview,
                      120,
                    ) || (
                      <span className="text-brown italic">no transcript</span>
                    )}
                  </p>
                </button>
                {demoteTarget && !lockedByOther && (
                  <div
                    ref={menuOpen ? menuContainerRef : null}
                    className={
                      menuOpen
                        ? 'absolute top-2 right-2 visible'
                        : 'absolute top-2 right-2 invisible group-hover:visible'
                    }
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(menuOpen ? null : item.recording_id)
                      }}
                      disabled={rowDemoting}
                      className="px-1.5 py-0.5 rounded text-ink/60 hover:bg-ink/10 hover:text-ink text-base leading-none disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Row actions"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      title="Row actions"
                    >
                      {rowDemoting ? '...' : '⋯'}
                    </button>
                    {menuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full mt-1 w-44 rounded border border-ink/15 bg-white shadow-lg z-10"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                            setDemotingId(item.recording_id)
                            void onDemote(item.recording_id, demoteTarget).finally(
                              () => setDemotingId(null),
                            )
                          }}
                          className="block w-full text-left px-3 py-2 text-xs text-ink hover:bg-cream"
                        >
                          {demoteLabel}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </aside>
  )
}
