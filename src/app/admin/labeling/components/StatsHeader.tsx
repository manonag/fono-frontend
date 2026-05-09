'use client'

import type { StatsResponse } from '../lib/types'

interface StatsHeaderProps {
  stats: StatsResponse | null
  onRefresh: () => void
  refreshing: boolean
}

export function StatsHeader({ stats, onRefresh, refreshing }: StatsHeaderProps) {
  const verified = stats?.by_status.verified ?? 0
  const gold = stats?.by_status.gold ?? 0
  const total = stats?.total_recordings_with_audio ?? 0
  const pct = total === 0 ? 0 : Math.round(((verified + gold) / total) * 100)

  return (
    <div className="flex items-center gap-6 px-6 py-2 bg-ink/5 border-b border-ink/10 text-xs text-ink">
      <span>
        <strong className="text-ink">Verified:</strong>{' '}
        {verified + gold} / {total}{' '}
        <span className="text-brown">({pct}%)</span>
      </span>
      <span>
        <strong className="text-ink">Gold set:</strong> {gold}
      </span>
      <span>
        <strong className="text-ink">Mean words:</strong>{' '}
        machine {stats?.mean_words_machine?.toFixed(1) ?? '—'} / verified{' '}
        {stats?.mean_words_verified?.toFixed(1) ?? '—'}
      </span>
      <span className="text-brown">
        Reviews: {stats?.total_reviews ?? '—'}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="ml-auto text-terra hover:text-terra-dark disabled:text-brown text-xs"
      >
        {refreshing ? 'Refreshing…' : 'Refresh ↻'}
      </button>
    </div>
  )
}
