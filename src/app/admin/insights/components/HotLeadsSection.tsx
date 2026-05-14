// Hot Leads section for the /admin/insights dashboard (sprint 1610b462).
// Pulls high-confidence, non-excluded sessions (hot_leads_only=true) and
// shows summary + captured contact + reasoning, with an inline transcript
// expander. Paginated with a Show more button.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchSessions, TaraInsightsApiError } from '../lib/api'
import type { SessionAnalysis } from '../lib/types'
import { formatAbsolute, formatRelative } from '../lib/format'
import { ConversationDetail } from './ConversationDetail'

const PAGE_SIZE = 50

const EMPTY_TEXT =
  'No hot leads yet. Hot leads appear when a visitor meets criteria: ' +
  'multi-location restaurant, named restaurant, specific timeline, or ' +
  'explicit purchase intent language.'

export function HotLeadsSection({ token }: { token: string }) {
  const [leads, setLeads] = useState<SessionAnalysis[]>([])
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
          hotLeadsOnly: true,
          limit: PAGE_SIZE,
          offset: nextOffset,
        })
        setTotal(res.total)
        setOffset(res.offset)
        setLeads((prev) =>
          append ? [...prev, ...res.sessions] : res.sessions,
        )
      } catch (err) {
        setError(
          err instanceof TaraInsightsApiError
            ? err.detail
            : 'Failed to load hot leads',
        )
      } finally {
        setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    load(0, false)
  }, [load])

  const hasMore = leads.length < total

  return (
    <section className="p-6">
      <div className="flex items-baseline gap-2 mb-3">
        <h2 className="text-lg font-bold">Hot Leads</h2>
        {total > 0 && <span className="text-sm text-brown">{total} total</span>}
      </div>

      {error && (
        <div className="mb-3 p-3 rounded bg-red-100 text-red-800 text-sm">
          {error}
        </div>
      )}
      {loading && leads.length === 0 && (
        <p className="text-brown text-sm">Loading hot leads...</p>
      )}
      {!loading && !error && leads.length === 0 && (
        <p className="text-brown text-sm max-w-2xl">{EMPTY_TEXT}</p>
      )}

      {leads.length > 0 && (
        <div className="space-y-2">
          {leads.map((lead) => {
            const expanded = expandedId === lead.conversation_id
            return (
              <div
                key={lead.id}
                className="rounded-lg border border-ink/10 bg-white shadow-sm p-3"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <span
                    className="text-xs text-brown"
                    title={formatAbsolute(lead.processed_at)}
                  >
                    {formatRelative(lead.processed_at)}
                  </span>
                  <div className="flex gap-2 text-xs flex-wrap">
                    {lead.captured_email && (
                      <span className="rounded bg-ink/5 px-2 py-0.5">
                        Email: {lead.captured_email}
                      </span>
                    )}
                    {lead.captured_phone && (
                      <span className="rounded bg-ink/5 px-2 py-0.5">
                        Phone: {lead.captured_phone}
                      </span>
                    )}
                  </div>
                </div>

                {lead.conversation_summary && (
                  <p className="text-sm mt-1.5">{lead.conversation_summary}</p>
                )}
                {lead.hot_lead_reasoning && (
                  <p className="text-sm mt-1.5 text-brown">
                    <span className="font-semibold text-ink">Why hot: </span>
                    {lead.hot_lead_reasoning}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expanded ? null : lead.conversation_id)
                  }
                  className="mt-2 text-xs font-semibold text-terra hover:text-terra-dark"
                >
                  {expanded ? 'Hide transcript' : 'View transcript'}
                </button>
                {expanded && (
                  <ConversationDetail
                    token={token}
                    conversationId={lead.conversation_id}
                  />
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
          {loading ? 'Loading...' : `Show more (${leads.length} of ${total})`}
        </button>
      )}
    </section>
  )
}
