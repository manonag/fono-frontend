'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFonoToken } from '@/hooks/use-fono-token'
import {
  LabelingApiError,
  fetchMe,
  fetchRecording,
  fetchReviewQueue,
  patchRecording,
} from '../lib/api'
import { formatDateTime, formatMmSs, truncate } from '../lib/formatters'
import type {
  MeResponse,
  RecordingDetail,
  ReviewQueueItem,
} from '../lib/types'

type AuthState = 'loading' | 'allowed' | 'denied' | 'unauthenticated' | 'not_owner'

export default function ReviewQueuePage() {
  const token = useFonoToken()
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [me, setMe] = useState<MeResponse | null>(null)

  const [items, setItems] = useState<ReviewQueueItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [recording, setRecording] = useState<RecordingDetail | null>(null)
  const [recordingLoading, setRecordingLoading] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)

  const [notes, setNotes] = useState('')
  const [actionInFlight, setActionInFlight] = useState<'approve' | 'reject' | null>(
    null,
  )
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (token === undefined) return
    if (!token) {
      setAuthState('unauthenticated')
      return
    }
    let cancelled = false
    fetchMe(token)
      .then((data) => {
        if (cancelled) return
        setMe(data)
        setAuthState(data.role === 'owner' ? 'allowed' : 'not_owner')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof LabelingApiError && err.status === 403) {
          setAuthState('denied')
        } else {
          setAuthState('unauthenticated')
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const loadQueue = useCallback(
    async (opts?: { keepSelection?: boolean }) => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetchReviewQueue(token, { limit: 100 })
        setItems(res.items)
        setTotal(res.total)
        if (!opts?.keepSelection && res.items.length > 0 && !selectedId) {
          setSelectedId(res.items[0].recording_id)
        }
        if (selectedId && !res.items.find((i) => i.recording_id === selectedId)) {
          // Selection no longer in queue — clear it.
          setSelectedId(res.items[0]?.recording_id ?? null)
        }
      } catch (err) {
        const msg =
          err instanceof LabelingApiError ? err.detail : 'Failed to load review queue'
        setError(msg)
      } finally {
        setLoading(false)
      }
    },
    [token, selectedId],
  )

  useEffect(() => {
    if (authState !== 'allowed') return
    void loadQueue()
    // loadQueue closes over selectedId; safe to call once on mount + when allowed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState])

  useEffect(() => {
    if (authState !== 'allowed' || !token || !selectedId) {
      setRecording(null)
      return
    }
    let cancelled = false
    setRecordingLoading(true)
    setRecordingError(null)
    setNotes('')
    setActionError(null)
    fetchRecording(token, selectedId, undefined, { acquireLock: false })
      .then((rec) => {
        if (cancelled) return
        setRecording(rec)
        setNotes(rec.reviewer_notes_for_labeler ?? '')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg =
          err instanceof LabelingApiError ? err.detail : 'Failed to load recording'
        setRecordingError(msg)
      })
      .finally(() => {
        if (!cancelled) setRecordingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authState, token, selectedId])

  const onAction = useCallback(
    async (action: 'approve' | 'reject') => {
      if (!token || !selectedId) return
      const trimmed = notes.trim()
      if (action === 'reject' && !trimmed) {
        setActionError('Reviewer notes are required when rejecting')
        return
      }
      setActionInFlight(action)
      setActionError(null)
      try {
        await patchRecording(token, selectedId, {
          review_action: action,
          reviewer_notes_for_labeler: trimmed || null,
        })
        // Selection moves to next item; fully reload queue.
        const idx = items.findIndex((i) => i.recording_id === selectedId)
        const nextItem = items[idx + 1] ?? items[idx - 1] ?? null
        setSelectedId(nextItem ? nextItem.recording_id : null)
        await loadQueue({ keepSelection: true })
      } catch (err) {
        const msg = err instanceof LabelingApiError ? err.detail : 'Action failed'
        setActionError(msg)
      } finally {
        setActionInFlight(null)
      }
    },
    [token, selectedId, notes, items, loadQueue],
  )

  const machineSnippet = useMemo(() => {
    if (!recording) return null
    return recording.machine.transcript ?? null
  }, [recording])

  const verifiedSnippet = useMemo(() => {
    if (!recording) return null
    if (
      recording.verified_segments &&
      recording.verified_segments.length > 0
    ) {
      return recording.verified_segments
        .map((s) => `[${s.speaker_id}] ${s.transcript}`)
        .join('\n')
    }
    return recording.verified_transcript ?? null
  }, [recording])

  if (authState === 'loading') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <p className="text-brown">Checking access...</p>
      </main>
    )
  }
  if (authState === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <p>You need to sign in to view this page.</p>
      </main>
    )
  }
  if (authState === 'denied') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <h1 className="text-2xl font-bold mb-2">No admin access</h1>
        <p className="text-brown">Your account is not allowlisted.</p>
      </main>
    )
  }
  if (authState === 'not_owner') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <h1 className="text-2xl font-bold mb-2">Owner only</h1>
        <p className="text-brown">
          Only owners can approve or reject labels. Contact Mano if you need
          access.
        </p>
      </main>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-cream text-ink font-sans overflow-hidden">
      <header className="bg-ink text-cream px-6 py-3 flex-none">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Review queue</h1>
            <p className="text-xs text-cream/70">
              T-204 · in_review recordings awaiting owner approval
              {me?.name && <> · Owner: {me.name}</>}
            </p>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <a
              href="/admin/labeling"
              className="text-cream/70 hover:text-cream underline"
            >
              ← Labeling queue
            </a>
            <a
              href="/admin/users"
              className="text-cream/70 hover:text-cream underline"
            >
              Users
            </a>
            <a href="/admin" className="text-cream/70 hover:text-cream underline">
              Admin home
            </a>
          </nav>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-1/3 border-r border-ink/10 bg-white flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-ink/10 flex items-center justify-between">
            <h2 className="font-semibold text-ink">Pending review</h2>
            <span className="text-xs text-brown">{total} total</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {error && (
              <div className="m-3 p-2 rounded bg-red-100 text-red-800 text-xs">
                {error}
              </div>
            )}
            {loading && items.length === 0 && (
              <p className="text-brown text-sm p-4">Loading…</p>
            )}
            {!loading && items.length === 0 && !error && (
              <p className="text-brown text-sm p-4">
                No recordings are waiting for review. Nice work.
              </p>
            )}
            <ul>
              {items.map((item, idx) => {
                const selected = item.recording_id === selectedId
                return (
                  <li key={item.recording_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.recording_id)}
                      className={
                        selected
                          ? 'w-full text-left px-4 py-3 border-l-4 border-terra bg-cream'
                          : 'w-full text-left px-4 py-3 border-l-4 border-transparent hover:bg-ink/5'
                      }
                    >
                      <div className="flex items-center gap-2 text-xs text-brown mb-1">
                        <span className="font-mono w-7">
                          {(idx + 1).toString().padStart(3, ' ')}
                        </span>
                        <span className="font-mono text-ink">
                          {formatMmSs(item.duration_seconds)}
                        </span>
                        <span className="truncate">{item.tenant_name}</span>
                      </div>
                      <div className="text-xs text-ink mb-1">
                        Labeler:{' '}
                        <span className="font-semibold">
                          {item.labeler_name ?? item.labeler_email ?? 'unknown'}
                        </span>
                        {item.in_review_since && (
                          <span className="text-brown">
                            {' '}
                            · {formatDateTime(item.in_review_since)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-brown leading-snug line-clamp-2">
                        {truncate(item.verified_transcript_preview, 160) ||
                          truncate(item.machine_transcript_preview, 160) || (
                            <span className="italic">no transcript</span>
                          )}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-h-0 bg-cream">
          {recordingLoading && !recording && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-brown text-sm">Loading recording…</p>
            </div>
          )}
          {recordingError && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-red-700 text-sm">{recordingError}</p>
            </div>
          )}
          {!recording && !recordingLoading && !recordingError && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-brown text-sm">
                {items.length === 0
                  ? 'Nothing to review.'
                  : 'Select a recording from the list.'}
              </p>
            </div>
          )}
          {recording && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-none border-b border-ink/10 bg-white">
                <audio
                  src={recording.recording.audio_url}
                  controls
                  className="w-full"
                />
                <div className="px-4 py-2 text-xs text-brown flex flex-wrap gap-x-4 gap-y-1 font-mono">
                  <span>
                    <span className="text-ink/60">Recording</span>{' '}
                    {recording.recording_id.slice(0, 8)}…
                  </span>
                  <span>
                    <span className="text-ink/60">Tenant</span>{' '}
                    {recording.tenant_name}
                  </span>
                  <span>
                    <span className="text-ink/60">Duration</span>{' '}
                    {formatMmSs(recording.recording.duration_seconds)}
                  </span>
                  <span>
                    <span className="text-ink/60">Labeler</span>{' '}
                    {recording.labeler_user_id ? recording.labeler_user_id.slice(0, 8) + '…' : '—'}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                <section className="bg-white rounded-md shadow-sm border border-ink/10 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-brown mb-2">
                    Verified transcript
                  </h3>
                  <pre className="whitespace-pre-wrap text-sm text-ink font-sans">
                    {verifiedSnippet || (
                      <span className="text-brown italic">
                        No verified transcript saved yet.
                      </span>
                    )}
                  </pre>
                </section>

                <section className="bg-white rounded-md shadow-sm border border-ink/10 p-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-brown mb-2">
                    Machine transcript (Sarvam)
                  </h3>
                  <pre className="whitespace-pre-wrap text-sm text-ink/80 font-sans">
                    {machineSnippet || (
                      <span className="text-brown italic">No machine transcript.</span>
                    )}
                  </pre>
                </section>

                {recording.error_tags.length > 0 && (
                  <section className="bg-white rounded-md shadow-sm border border-ink/10 p-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-brown mb-2">
                      Error tags ({recording.error_tags.length})
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {recording.error_tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <div className="flex-none border-t border-ink/10 bg-white px-4 py-3 space-y-2">
                <label className="block">
                  <span className="block text-xs font-semibold text-ink mb-1">
                    Reviewer notes for labeler{' '}
                    <span className="text-brown font-normal">
                      (required to reject)
                    </span>
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="What was wrong, or why approving?"
                    className="w-full px-3 py-2 border border-ink/20 rounded text-sm resize-y"
                  />
                </label>
                {actionError && (
                  <p className="text-red-700 text-xs">{actionError}</p>
                )}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => void onAction('reject')}
                    disabled={actionInFlight !== null}
                    className="px-4 py-2 rounded border border-red-700 text-red-700 hover:bg-red-50 text-sm font-semibold disabled:opacity-50"
                  >
                    {actionInFlight === 'reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onAction('approve')}
                    disabled={actionInFlight !== null}
                    className="px-4 py-2 rounded bg-green-700 text-white hover:bg-green-800 text-sm font-semibold disabled:opacity-50"
                  >
                    {actionInFlight === 'approve' ? 'Approving…' : 'Approve → verified'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
