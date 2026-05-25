'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFonoToken } from '@/hooks/use-fono-token'
import { useHeartbeat } from '@/hooks/use-heartbeat'
import { LabelerHeader, deriveMyCounts } from './components/LabelerHeader'
import { QueuePane } from './components/QueuePane'
import { ResizableSplit } from './components/ResizableSplit'
import { ReviewPane } from './components/ReviewPane'
import { StatsHeader } from './components/StatsHeader'
import { AdjudicateMode } from './adjudicate/AdjudicateMode'
import {
  LabelingApiError,
  fetchActiveLabelers,
  fetchMe,
  fetchQueue,
  fetchRecording,
  fetchStats,
  patchRecording,
  swapAllSpeakers,
} from './lib/api'
import type {
  ActiveLabeler,
  MeResponse,
  PatchPayload,
  QueueFilter,
  QueueItem,
  RecordingDetail,
  StatsResponse,
} from './lib/types'

type AuthState = 'loading' | 'allowed' | 'denied' | 'unauthenticated'

const MIN_VIEWPORT_PX = 1280

function useMinViewport(min: number): boolean {
  const [ok, setOk] = useState(true)
  useEffect(() => {
    const check = () => setOk(window.innerWidth >= min)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [min])
  return ok
}

export default function LabelingPage() {
  const token = useFonoToken()
  const [authState, setAuthState] = useState<AuthState>('loading')
  // T-299: Verify | Adjudicate toggle. Default to Verify so the page
  // continues to render the labeling queue as before. Adjudicate switches
  // the body to the backend-fed eval gold-adjudication view; the verify
  // effects below are gated on this state so adjudicate mode does not
  // wastefully heartbeat locks or refetch the labeling queue.
  const [mode, setMode] = useState<'verify' | 'adjudicate'>('verify')
  const viewportOk = useMinViewport(MIN_VIEWPORT_PX)

  const [filter, setFilter] = useState<QueueFilter>('auto_labeled')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [queueTotal, setQueueTotal] = useState(0)
  const [queueLoading, setQueueLoading] = useState(false)
  const [queueError, setQueueError] = useState<string | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [recording, setRecording] = useState<RecordingDetail | null>(null)
  const [recordingLoading, setRecordingLoading] = useState(false)
  const [recordingError, setRecordingError] = useState<string | null>(null)

  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [statsRefreshing, setStatsRefreshing] = useState(false)

  const [me, setMe] = useState<MeResponse | null>(null)
  const [activeLabelers, setActiveLabelers] = useState<ActiveLabeler[]>([])

  const [queueComplete, setQueueComplete] = useState(false)

  const initialAutoSelectDone = useRef(false)

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
        setAuthState('allowed')
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

  useHeartbeat(token, authState === 'allowed' && mode === 'verify')

  useEffect(() => {
    if (authState !== 'allowed' || !token || mode !== 'verify') return
    let cancelled = false
    const load = () => {
      void fetchActiveLabelers(token)
        .then((res) => {
          if (!cancelled) setActiveLabelers(res.items)
        })
        .catch(() => {
          // best-effort: pill stays at the prior value
        })
    }
    load()
    const id = window.setInterval(load, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [authState, token, mode])

  const loadQueue = useCallback(
    async (opts?: { keepSelection?: boolean }) => {
      if (!token) return
      setQueueLoading(true)
      setQueueError(null)
      try {
        const res = await fetchQueue(token, { filter, sort: 'duration_desc', limit: 100 })
        setQueue(res.items)
        setQueueTotal(res.total)
        if (!opts?.keepSelection && !initialAutoSelectDone.current && res.items.length > 0) {
          setSelectedId(res.items[0].recording_id)
          initialAutoSelectDone.current = true
        }
      } catch (err) {
        const msg = err instanceof LabelingApiError ? err.detail : 'Failed to load queue'
        setQueueError(msg)
      } finally {
        setQueueLoading(false)
      }
    },
    [token, filter],
  )

  const loadStats = useCallback(async () => {
    if (!token) return
    setStatsRefreshing(true)
    try {
      const res = await fetchStats(token)
      setStats(res)
    } catch {
      // best-effort
    } finally {
      setStatsRefreshing(false)
    }
  }, [token])

  useEffect(() => {
    if (authState !== 'allowed' || mode !== 'verify') return
    initialAutoSelectDone.current = false
    void loadQueue()
    void loadStats()
  }, [authState, mode, loadQueue, loadStats])

  useEffect(() => {
    if (authState !== 'allowed' || !token || !selectedId || mode !== 'verify') {
      setRecording(null)
      return
    }
    let cancelled = false
    setRecordingLoading(true)
    setRecordingError(null)
    fetchRecording(token, selectedId)
      .then((rec) => {
        if (cancelled) return
        setRecording(rec)
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
  }, [authState, mode, token, selectedId])

  const handleFilterChange = useCallback((next: QueueFilter) => {
    setFilter(next)
    initialAutoSelectDone.current = false
    setQueueComplete(false)
  }, [])

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id)
    setQueueComplete(false)
  }, [])

  const findNextAutoLabeled = useCallback(
    (currentId: string | null, items: QueueItem[]): string | null => {
      if (!currentId) {
        const first = items.find((i) => i.status === 'auto_labeled')
        return first?.recording_id ?? null
      }
      const idx = items.findIndex((i) => i.recording_id === currentId)
      const search = idx === -1 ? items : items.slice(idx + 1)
      const next = search.find((i) => i.status === 'auto_labeled')
      if (next) return next.recording_id
      const wrap = items.find(
        (i) => i.status === 'auto_labeled' && i.recording_id !== currentId,
      )
      return wrap?.recording_id ?? null
    },
    [],
  )

  const hasNext = useMemo(() => {
    return findNextAutoLabeled(selectedId, queue) !== null
  }, [findNextAutoLabeled, selectedId, queue])

  const handleSave = useCallback(
    async (
      payload: PatchPayload,
      options: { advanceAfter: boolean },
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!token || !selectedId) return { ok: false, error: 'Not authenticated' }
      try {
        const result =
          Object.keys(payload).length > 0
            ? await patchRecording(token, selectedId, payload)
            : null
        if (result) {
          // PATCH returns a summary, not RecordingDetail. Re-fetch to refresh
          // recording state without re-acquiring the lock (labeler save
          // already released it; owner doesn't need to claim).
          const fresh = await fetchRecording(token, selectedId, undefined, {
            acquireLock: false,
          })
          if (fresh) setRecording(fresh)
        }
        const queueRes = await fetchQueue(token, {
          filter,
          sort: 'duration_desc',
          limit: 100,
        })
        setQueue(queueRes.items)
        setQueueTotal(queueRes.total)
        void loadStats()
        if (options.advanceAfter) {
          const next = findNextAutoLabeled(selectedId, queueRes.items)
          if (next) {
            setSelectedId(next)
          } else {
            setQueueComplete(true)
          }
        }
        return { ok: true }
      } catch (err) {
        if (err instanceof LabelingApiError) {
          return { ok: false, error: `${err.status}: ${err.detail}` }
        }
        return { ok: false, error: 'Network error. Form state preserved.' }
      }
    },
    [token, selectedId, filter, loadStats, findNextAutoLabeled],
  )

  // T-2d16e333: recovery demote. Sends a status-only PATCH for the given
  // recording_id, then refreshes the queue, stats, and (if it's the
  // currently-selected row) the loaded recording so the form rebuilds.
  // Independent of form save flow; existing unsaved edits in the form
  // are untouched in the UI but will be overwritten when the recording
  // refresh swaps the form state.
  const handleDemote = useCallback(
    async (
      recordingId: string,
      target: 'auto_labeled' | 'verified',
    ): Promise<{ ok: boolean; error?: string }> => {
      if (!token) return { ok: false, error: 'Not authenticated' }
      try {
        await patchRecording(token, recordingId, { status: target })
        const queueRes = await fetchQueue(token, {
          filter,
          sort: 'duration_desc',
          limit: 100,
        })
        setQueue(queueRes.items)
        setQueueTotal(queueRes.total)
        void loadStats()
        if (recordingId === selectedId) {
          const fresh = await fetchRecording(token, selectedId, undefined, {
            acquireLock: false,
          })
          if (fresh) setRecording(fresh)
        }
        return { ok: true }
      } catch (err) {
        if (err instanceof LabelingApiError) {
          return { ok: false, error: `${err.status}: ${err.detail}` }
        }
        return { ok: false, error: 'Network error. Demote not applied.' }
      }
    },
    [token, filter, loadStats, selectedId],
  )

  // ReviewPane's demote button operates on the currently selected row.
  const handlePaneDemote = useCallback(
    (target: 'auto_labeled' | 'verified') => {
      if (!selectedId) {
        return Promise.resolve({ ok: false, error: 'No row selected' })
      }
      return handleDemote(selectedId, target)
    },
    [handleDemote, selectedId],
  )

  // Sprint 1: bulk speaker swap on the currently selected row. The endpoint
  // commits server-side and returns the full RecordingDetail, so we replace
  // local state directly instead of refetching (no second round-trip; the
  // lock stays held since swap is mid-edit and doesn't release it).
  const handleSwapSpeakers = useCallback(async (): Promise<{
    ok: boolean
    error?: string
  }> => {
    if (!token) return { ok: false, error: 'Not authenticated' }
    if (!selectedId) return { ok: false, error: 'No row selected' }
    try {
      const fresh = await swapAllSpeakers(token, selectedId)
      setRecording(fresh)
      return { ok: true }
    } catch (err) {
      if (err instanceof LabelingApiError) {
        return { ok: false, error: `${err.status}: ${err.detail}` }
      }
      return { ok: false, error: 'Network error. Swap not applied.' }
    }
  }, [token, selectedId])

  if (!viewportOk) {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Wider viewport needed</h1>
          <p className="text-brown">
            The labeling dashboard requires at least {MIN_VIEWPORT_PX}px width. Resize your
            window or use a larger display.
          </p>
        </div>
      </main>
    )
  }

  if (authState === 'loading') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <p className="text-brown">Checking access…</p>
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
        <p className="text-brown">
          Your account does not have access to the Fono admin dashboard. If you believe
          this is wrong, contact Mano.
        </p>
      </main>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-cream text-ink font-sans overflow-hidden">
      <header className="bg-ink text-cream px-6 py-3 flex-none">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Labeling Queue</h1>
            <p className="text-xs text-cream/70">
              {mode === 'verify'
                ? 'T-199 Phase A · Sarvam transcript verification'
                : 'T-299 · Eval gold-adjudication overlay'}
            </p>
          </div>
          <div className="flex items-center bg-cream/10 rounded p-0.5">
            <button
              type="button"
              onClick={() => setMode('verify')}
              className={
                mode === 'verify'
                  ? 'px-3 py-1 rounded text-sm font-semibold bg-cream text-ink'
                  : 'px-3 py-1 rounded text-sm font-medium text-cream/80 hover:text-cream'
              }
            >
              Verify
            </button>
            <button
              type="button"
              onClick={() => setMode('adjudicate')}
              className={
                mode === 'adjudicate'
                  ? 'px-3 py-1 rounded text-sm font-semibold bg-cream text-ink'
                  : 'px-3 py-1 rounded text-sm font-medium text-cream/80 hover:text-cream'
              }
            >
              Adjudicate
            </button>
          </div>
          <a
            href="/admin"
            className="text-xs text-cream/70 hover:text-cream underline"
          >
            ← Admin home
          </a>
        </div>
      </header>
      {mode === 'verify' && (
        <>
          <LabelerHeader
            me={me}
            myCounts={deriveMyCounts(me, stats?.by_labeler)}
            activeLabelers={activeLabelers}
          />
          <StatsHeader stats={stats} onRefresh={loadStats} refreshing={statsRefreshing} />
          <ResizableSplit
            className="flex-1 min-h-0"
            initialLeftWidth="33%"
            minWidth={240}
            left={
              <QueuePane
                items={queue}
                total={queueTotal}
                loading={queueLoading}
                error={queueError}
                filter={filter}
                selectedId={selectedId}
                currentUserId={me?.user_id ?? null}
                onFilterChange={handleFilterChange}
                onSelect={handleSelect}
                onDemote={handleDemote}
              />
            }
            right={
              <ReviewPane
                recording={recording}
                loading={recordingLoading}
                error={recordingError}
                hasNext={hasNext}
                onSave={handleSave}
                onDemote={handlePaneDemote}
                onSwapSpeakers={handleSwapSpeakers}
              />
            }
          />
        </>
      )}
      {mode === 'adjudicate' && token && <AdjudicateMode token={token} />}
      {queueComplete && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center pointer-events-none">
          <div className="pointer-events-auto bg-ink text-cream px-6 py-3 rounded shadow-lg flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <span className="font-semibold">Queue complete!</span>
            <button
              type="button"
              onClick={() => setQueueComplete(false)}
              className="text-cream/70 hover:text-cream text-sm ml-2"
            >
              dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
