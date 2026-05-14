// Recent Conversations section for the /admin/insights dashboard
// (sprint 1610b462). Holds the filter state, fetches tara_session_analysis
// rows for the active filters, and renders each as a click-to-expand card
// with intent / tone / confidence badges. Paginated with a Show more
// button.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchSessions, TaraInsightsApiError } from '../lib/api'
import type { SessionAnalysis } from '../lib/types'
import { formatAbsolute, formatRelative } from '../lib/format'
import { ConfidenceBadge, IntentBadge, ToneBadge } from './badges'
import { ConversationDetail } from './ConversationDetail'
import {
  DEFAULT_FILTERS,
  InsightsFilters,
  dateRangeToIso,
} from './InsightsFilters'
import type { InsightsFiltersState } from './InsightsFilters'

const PAGE_SIZE = 100

export function ConversationsSection({ token }: { token: string }) {
  const [filters, setFilters] = useState<InsightsFiltersState>(DEFAULT_FILTERS)
  const [sessions, setSessions] = useState<SessionAnalysis[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(
    async (nextOffset: number, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchSessions(token, {
          dateFrom: dateRangeToIso(filters.dateRange),
          primaryIntent: filters.primaryIntent,
          emotionalTone: filters.emotionalTone,
          hotLeadConfidence: filters.hotLeadConfidence,
          showExcluded: filters.showExcluded,
          limit: PAGE_SIZE,
          offset: nextOffset,
        })
        setTotal(res.total)
        setOffset(res.offset)
        setSessions((prev) =>
          append ? [...prev, ...res.sessions] : res.sessions,
        )
      } catch (err) {
        setError(
          err instanceof TaraInsightsApiError
            ? err.detail
            : 'Failed to load conversations',
        )
      } finally {
        setLoading(false)
      }
    },
    [token, filters],
  )

  // Re-runs whenever load changes, i.e. whenever filters change, which
  // resets the list to offset 0 with the new filters applied.
  useEffect(() => {
    load(0, false)
  }, [load])

  const hasMore = sessions.length < total

  return (
    <section className="p-6 border-t border-ink/10">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-lg font-bold">Recent Conversations</h2>
        {total > 0 && <span className="text-sm text-brown">{total} total</span>}
      </div>

      <InsightsFilters value={filters} onChange={setFilters} />

      {error && (
        <div className="mb-3 p-3 rounded bg-red-100 text-red-800 text-sm">
          {error}
        </div>
      )}
      {loading && sessions.length === 0 && (
        <p className="text-brown text-sm">Loading conversations...</p>
      )}
      {!loading && !error && sessions.length === 0 && (
        <p className="text-brown text-sm">
          No conversations match these filters.
        </p>
      )}

      {sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((s) => {
            const expanded = expandedId === s.conversation_id
            return (
              <div
                key={s.id}
                className="rounded-lg border border-ink/10 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expanded ? null : s.conversation_id)
                  }
                  className="w-full text-left p-3"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span
                      className="text-xs text-brown"
                      title={formatAbsolute(s.processed_at)}
                    >
                      {formatRelative(s.processed_at)}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <IntentBadge value={s.primary_intent} />
                      <ToneBadge value={s.emotional_tone} />
                      <ConfidenceBadge value={s.hot_lead_confidence} />
                    </div>
                  </div>
                  {s.conversation_summary && (
                    <p className="text-sm mt-1.5">{s.conversation_summary}</p>
                  )}
                </button>
                {expanded && (
                  <div className="px-3 pb-3">
                    <ConversationDetail
                      token={token}
                      conversationId={s.conversation_id}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => load(offset + PAGE_SIZE, true)}
          disabled={loading}
          className="mt-3 px-4 py-2 rounded-lg bg-terra text-white text-sm font-semibold hover:bg-terra-dark disabled:opacity-50"
        >
          {loading
            ? 'Loading...'
            : `Show more (${sessions.length} of ${total})`}
        </button>
      )}
    </section>
  )
}
