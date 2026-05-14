// Expanded conversation view for the /admin/insights dashboard
// (sprint 1610b462). Fetches the full transcript + grouped insights on
// mount; shared by the Hot Leads and Recent Conversations sections.

'use client'

import { useEffect, useState } from 'react'
import { fetchConversation, TaraInsightsApiError } from '../lib/api'
import type { ConversationDetail as ConversationDetailData } from '../lib/types'
import { formatAbsolute, humanize } from '../lib/format'

interface Props {
  token: string
  conversationId: string
}

export function ConversationDetail({ token, conversationId }: Props) {
  const [data, setData] = useState<ConversationDetailData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    fetchConversation(token, conversationId, ctrl.signal)
      .then((d) => {
        if (!ctrl.signal.aborted) setData(d)
      })
      .catch((err) => {
        if (ctrl.signal.aborted) return
        setError(
          err instanceof TaraInsightsApiError
            ? err.detail
            : 'Failed to load conversation',
        )
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [token, conversationId])

  if (loading) {
    return <p className="text-brown text-sm py-3">Loading conversation...</p>
  }
  if (error) {
    return <p className="text-red-700 text-sm py-3">{error}</p>
  }
  if (!data) return null

  const { session, transcript, insights_by_type } = data
  const insightGroups = Object.entries(insights_by_type)
  const hasContactOrFlags =
    !!session &&
    (!!session.captured_email ||
      !!session.captured_phone ||
      session.exclusion_flags.length > 0)

  return (
    <div className="mt-3 border-t border-ink/10 pt-3 space-y-4">
      {hasContactOrFlags && session && (
        <div className="flex flex-wrap gap-2 text-xs">
          {session.captured_email && (
            <span className="rounded bg-ink/5 px-2 py-1">
              Email: {session.captured_email}
            </span>
          )}
          {session.captured_phone && (
            <span className="rounded bg-ink/5 px-2 py-1">
              Phone: {session.captured_phone}
            </span>
          )}
          {session.exclusion_flags.map((flag) => (
            <span
              key={flag}
              className="rounded bg-amber-100 text-amber-800 px-2 py-1"
            >
              Excluded: {humanize(flag)}
            </span>
          ))}
        </div>
      )}

      <div>
        <h4 className="text-xs font-bold uppercase text-brown mb-2">
          Transcript
        </h4>
        {transcript.length === 0 ? (
          <p className="text-brown text-sm">No transcript turns recorded.</p>
        ) : (
          <div className="space-y-2">
            {transcript.map((turn, i) => (
              <div key={i} className="space-y-2">
                {turn.user_message && (
                  <div className="flex justify-start">
                    <div
                      className="max-w-[85%] rounded-2xl rounded-tl-sm bg-ink/5 px-3 py-2 text-sm"
                      title={formatAbsolute(turn.created_at)}
                    >
                      {turn.user_message}
                    </div>
                  </div>
                )}
                {turn.assistant_message && (
                  <div className="flex justify-end">
                    <div
                      className="max-w-[85%] rounded-2xl rounded-tr-sm bg-terra/10 px-3 py-2 text-sm"
                      title={formatAbsolute(turn.created_at)}
                    >
                      {turn.assistant_message}
                    </div>
                  </div>
                )}
                {turn.error && (
                  <p className="text-xs text-red-700">
                    Turn error: {turn.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase text-brown mb-2">
          Extracted insights
        </h4>
        {insightGroups.length === 0 ? (
          <p className="text-brown text-sm">
            No insights extracted for this conversation.
          </p>
        ) : (
          <div className="space-y-3">
            {insightGroups.map(([type, items]) => (
              <div key={type}>
                <p className="text-xs font-semibold text-ink mb-1">
                  {humanize(type)}{' '}
                  <span className="text-brown font-normal">
                    ({items.length})
                  </span>
                </p>
                <ul className="space-y-1">
                  {items.map((ins) => (
                    <li key={ins.id} className="text-sm">
                      {ins.summary}
                      {ins.verbatim_quote && (
                        <span className="block text-brown italic">
                          &quot;{ins.verbatim_quote}&quot;
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
