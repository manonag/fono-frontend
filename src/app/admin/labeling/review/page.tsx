'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFonoToken } from '@/hooks/use-fono-token'
import {
  LabelingApiError,
  fetchMe,
  fetchRecording,
  fetchReviewQueue,
  patchRecording,
} from '../lib/api'
import { AudioPlayer, type AudioPlayerHandle } from '../components/AudioPlayer'
import { CollapsibleTagPanel } from '../components/CollapsibleTagPanel'
import { ResizableSplit } from '../components/ResizableSplit'
import { ScrollSyncToggle } from '../components/ScrollSyncToggle'
import { type TagPanelValue } from '../components/TagPanel'
import { TranscriptColumn } from '../components/TranscriptColumn'
import { useSyncedColumnScroll } from '../hooks/useSyncedColumnScroll'
import { diffSegments } from '../lib/segment-diff'
import { formatDateTime, formatMmSs, truncate } from '../lib/formatters'
import type {
  MeResponse,
  PatchPayload,
  RecordingDetail,
  ReviewQueueItem,
  VerifiedSegment,
} from '../lib/types'

type AuthState = 'loading' | 'allowed' | 'denied' | 'unauthenticated' | 'not_owner'
type ActionKind = 'approve' | 'send_back'

// Sarvam emits speaker_id as bare digit strings ("0", "1") in
// diarized_transcript. TranscriptColumn keys off the "speaker_<n>" form
// for styling and S1/S2 swap, so normalize at this boundary. Mirrors the
// same helper in components/ReviewPane.tsx (labeler page).
function normalizeSpeakerId(rawId: string): string {
  return /^\d+$/.test(rawId) ? `speaker_${rawId}` : rawId
}

function cloneSegment(s: VerifiedSegment): VerifiedSegment {
  return {
    speaker_id: s.speaker_id,
    transcript: s.transcript,
    start_time_seconds: s.start_time_seconds,
    end_time_seconds: s.end_time_seconds,
    edited_by_user_id: s.edited_by_user_id ?? null,
    edited_at: s.edited_at ?? null,
  }
}

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
  const [actionInFlight, setActionInFlight] = useState<ActionKind | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  // Owner's editable column state. Initialised on recording load as a deep
  // clone of verified_segments (with normalized speaker ids). The backend
  // stamps authorship on save via stamp_segment_authorship; we do not
  // stamp client-side. V1 keeps things deterministic.
  const [ownerEditSegments, setOwnerEditSegments] = useState<VerifiedSegment[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const preEditRef = useRef<string>('')

  // Owner-editable tag state (Commit 4.5). Initialised on recording load
  // as a clone of the labeler's selections. On Approve the full payload
  // includes all tag fields; on Send back tag fields are intentionally
  // omitted so the labeler's selections survive the round-trip
  // unchanged (asymmetric Option C semantics).
  const [ownerTags, setOwnerTags] = useState<TagPanelValue | null>(null)

  // Audio player integration. activeSegmentIndex derives from currentTime
  // inside TranscriptColumn per column; clicking a segment seeks the audio.
  const audioRef = useRef<AudioPlayerHandle | null>(null)
  const [currentTime, setCurrentTime] = useState(0)

  // Bidirectional scroll sync (Commit 5.7). Off by default; the floating
  // toggle button at the bottom-right flips it on for the session. When on,
  // a scroll in any column scrolls the other two so the segment at the top
  // matches across all three columns. Off resets each column to scroll
  // independently (pre-5.7 behavior).
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(false)
  const col1Ref = useRef<HTMLDivElement | null>(null)
  const col2Ref = useRef<HTMLDivElement | null>(null)
  const col3Ref = useRef<HTMLDivElement | null>(null)
  const { scrollToSegment } = useSyncedColumnScroll({
    enabled: scrollSyncEnabled,
    columnRefs: [col1Ref, col2Ref, col3Ref],
  })

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
          // Selection no longer in queue. Clear it (caller may have set a
          // next-item already; this is the fallback).
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

  // Reset edit-state and seed owner's columns whenever a new recording loads.
  useEffect(() => {
    if (!recording) {
      setOwnerEditSegments([])
      setEditingIndex(null)
      setCurrentTime(0)
      setOwnerTags(null)
      return
    }
    setOwnerEditSegments(
      (recording.verified_segments ?? []).map((s) => ({
        ...cloneSegment(s),
        speaker_id: normalizeSpeakerId(s.speaker_id),
      })),
    )
    setEditingIndex(null)
    setCurrentTime(0)
    setOwnerTags({
      language_profile_tag: recording.language_profile_tag,
      call_type_tag: recording.call_type_tag,
      audio_quality_tag: recording.audio_quality_tag,
      error_tags: [...recording.error_tags],
      contains_menu_items: recording.contains_menu_items,
      contains_prices: recording.contains_prices,
      contains_phone_numbers: recording.contains_phone_numbers,
      contains_names: recording.contains_names,
      is_holdout: recording.is_holdout,
      reviewer_notes: recording.reviewer_notes ?? '',
    })
  }, [recording])

  // ── Memoised derived state ─────────────────────────────────────────────

  const machineSegments = useMemo<VerifiedSegment[]>(() => {
    if (!recording) return []
    const entries = recording.machine.diarization?.entries ?? []
    if (entries.length > 0) {
      return entries.map((e) => ({
        speaker_id: normalizeSpeakerId(e.speaker_id),
        transcript: e.transcript,
        start_time_seconds: e.start_time_seconds,
        end_time_seconds: e.end_time_seconds,
      }))
    }
    // Synthesize a single-segment fallback when diarization is missing
    // (older rows). The reviewer still sees the machine text; diff
    // highlighting on Column 2 is suppressed in this case (see below).
    return [
      {
        speaker_id: 'speaker_0',
        transcript: recording.machine.transcript ?? '',
        start_time_seconds: 0,
        end_time_seconds: recording.recording.duration_seconds ?? 0,
      },
    ]
  }, [recording])

  const verifiedSegments = useMemo<VerifiedSegment[]>(() => {
    if (!recording) return []
    return (recording.verified_segments ?? []).map((s) => ({
      ...cloneSegment(s),
      speaker_id: normalizeSpeakerId(s.speaker_id),
    }))
  }, [recording])

  const machineIsSynthesized = useMemo(() => {
    if (!recording) return true
    const entries = recording.machine.diarization?.entries
    return !entries || entries.length === 0
  }, [recording])

  // Diff Column 2 (labeler) vs Column 1 (machine). Skipped when machine
  // is synthesized. The single-segment fallback would mark everything
  // as 'changed', which is more confusing than useful.
  const diffStatusesLabeler = useMemo(() => {
    if (!recording || machineIsSynthesized) return undefined
    return diffSegments(machineSegments, verifiedSegments).perSegmentStatus
  }, [recording, machineIsSynthesized, machineSegments, verifiedSegments])

  // Diff Column 3 (owner) vs Column 2 (labeler). Always computed; rows
  // identical to labeler's submission render with no class (empty string
  // from diffStatusToTailwindClass).
  const diffOwnerVsLabeler = useMemo(() => {
    if (!recording) return null
    return diffSegments(verifiedSegments, ownerEditSegments)
  }, [recording, verifiedSegments, ownerEditSegments])

  const diffStatusesOwner = diffOwnerVsLabeler?.perSegmentStatus

  const ownerHasEdits = useMemo(() => {
    if (!diffOwnerVsLabeler) return false
    return (
      diffOwnerVsLabeler.perSegmentStatus.some((s) => s !== 'unchanged') ||
      diffOwnerVsLabeler.deletedBaselineIndices.length > 0
    )
  }, [diffOwnerVsLabeler])

  // ── Edit-lifecycle handlers (Column 3) ──────────────────────────────────

  const handleEditStart = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= ownerEditSegments.length) return
      preEditRef.current = ownerEditSegments[idx].transcript
      setEditingIndex(idx)
    },
    [ownerEditSegments],
  )

  const updateOwnerSegmentTranscript = useCallback(
    (idx: number, transcript: string) => {
      setOwnerEditSegments((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, transcript } : s)),
      )
    },
    [],
  )

  const handleEditCommit = useCallback(() => {
    setEditingIndex(null)
  }, [])

  const handleEditCancel = useCallback((idx: number) => {
    setOwnerEditSegments((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, transcript: preEditRef.current } : s,
      ),
    )
    setEditingIndex(null)
  }, [])

  const swapOwnerSegmentSpeaker = useCallback((idx: number) => {
    setOwnerEditSegments((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s
        let next = s.speaker_id
        if (s.speaker_id === 'speaker_0') next = 'speaker_1'
        else if (s.speaker_id === 'speaker_1') next = 'speaker_0'
        return { ...s, speaker_id: next }
      }),
    )
  }, [])

  const handleSeek = useCallback((seconds: number) => {
    audioRef.current?.seekTo(seconds)
    void audioRef.current?.play()
  }, [])

  // ── Action handlers ────────────────────────────────────────────────────

  const advanceToNext = useCallback(async () => {
    if (!selectedId) return
    const idx = items.findIndex((i) => i.recording_id === selectedId)
    const nextItem = items[idx + 1] ?? items[idx - 1] ?? null
    setSelectedId(nextItem ? nextItem.recording_id : null)
    await loadQueue({ keepSelection: true })
  }, [items, selectedId, loadQueue])

  const onApprove = useCallback(async () => {
    if (!token || !selectedId) return
    setActionInFlight('approve')
    setActionError(null)
    try {
      const trimmed = notes.trim()
      const payload: PatchPayload = {
        review_action: 'approve',
        // Owner's edits (or an unchanged clone of labeler's segments)
        // become the verified truth. Backend re-stamps authorship on
        // segments whose transcript or speaker_id differ from the prior
        // version, preserving labeler's stamps on untouched segments.
        verified_segments: ownerEditSegments,
        reviewer_notes_for_labeler: trimmed || null,
      }
      // Owner-edited tag state (Commit 4.5). Always carried on Approve so
      // owner's choices overwrite labeler's. ownerTags is non-null
      // whenever recording is non-null (set in the same load effect), but
      // gate defensively anyway.
      if (ownerTags) {
        payload.error_tags = ownerTags.error_tags
        payload.language_profile_tag = ownerTags.language_profile_tag
        payload.call_type_tag = ownerTags.call_type_tag
        payload.audio_quality_tag = ownerTags.audio_quality_tag
        payload.contains_menu_items = ownerTags.contains_menu_items
        payload.contains_prices = ownerTags.contains_prices
        payload.contains_phone_numbers = ownerTags.contains_phone_numbers
        payload.contains_names = ownerTags.contains_names
        payload.is_holdout = ownerTags.is_holdout
        payload.reviewer_notes = ownerTags.reviewer_notes
      }
      await patchRecording(token, selectedId, payload)
      await advanceToNext()
    } catch (err) {
      const msg = err instanceof LabelingApiError ? err.detail : 'Approve failed'
      setActionError(msg)
    } finally {
      setActionInFlight(null)
    }
  }, [token, selectedId, ownerEditSegments, ownerTags, notes, advanceToNext])

  const onSendBack = useCallback(async () => {
    if (!token || !selectedId) return
    const trimmed = notes.trim()
    if (!trimmed) {
      setActionError(
        'Add a note for the labeler explaining what to change.',
      )
      return
    }
    setActionInFlight('send_back')
    setActionError(null)
    try {
      const payload: PatchPayload = {
        review_action: 'send_back',
        reviewer_notes_for_labeler: trimmed,
      }
      if (ownerHasEdits) {
        // Owner edited at least one segment. Carry owner_segments so the
        // labeler can compare. Backend will stamp authorship + persist.
        payload.owner_segments = ownerEditSegments
      }
      await patchRecording(token, selectedId, payload)
      await advanceToNext()
    } catch (err) {
      const msg = err instanceof LabelingApiError ? err.detail : 'Send back failed'
      setActionError(msg)
    } finally {
      setActionInFlight(null)
    }
  }, [
    token,
    selectedId,
    ownerHasEdits,
    ownerEditSegments,
    notes,
    advanceToNext,
  ])

  // ── Auth gates ─────────────────────────────────────────────────────────

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
          Only owners can approve or send back labels. Contact Mano if you need access.
        </p>
      </main>
    )
  }

  const sendBackDisabled =
    actionInFlight !== null || notes.trim().length === 0
  const sendBackTitle =
    notes.trim().length === 0
      ? 'Add a note for the labeler explaining what to change.'
      : 'Returns the row to the labeler with your notes and any edits as suggestions.'

  return (
    <div className="h-screen flex flex-col bg-cream text-ink font-sans overflow-hidden">
      <header className="bg-ink text-cream px-6 py-3 flex-none">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Review queue</h1>
            <p className="text-xs text-cream/70">
              in_review recordings awaiting owner approval
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

      <ResizableSplit
        className="flex-1 min-h-0"
        initialLeftWidth="33%"
        minWidth={240}
        left={
          <aside className="h-full w-full border-r border-ink/10 bg-white flex flex-col min-h-0">
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
        }
        right={
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
                <AudioPlayer
                  ref={audioRef}
                  src={recording.recording.audio_url}
                  onTimeUpdate={setCurrentTime}
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
                    {recording.labeler_user_id
                      ? recording.labeler_user_id.slice(0, 8) + '…'
                      : '-'}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0 p-2 overflow-hidden">
                <ResizableSplit
                  className="h-full"
                  initialLeftWidth="33.33%"
                  minWidth={200}
                  left={
                    <div className="bg-white rounded-md shadow-sm border border-ink/10 flex flex-col min-h-0 overflow-hidden h-full">
                      <TranscriptColumn
                        mode="readonly"
                        title="Machine (Sarvam)"
                        segments={machineSegments}
                        fallbackTranscript={recording.machine.transcript}
                        currentTime={currentTime}
                        onSeek={handleSeek}
                        scrollContainerRef={col1Ref}
                      />
                    </div>
                  }
                  right={
                    <ResizableSplit
                      className="h-full"
                      initialLeftWidth="50%"
                      minWidth={200}
                      left={
                        <div className="bg-white rounded-md shadow-sm border border-ink/10 flex flex-col min-h-0 overflow-hidden h-full">
                          <TranscriptColumn
                            mode="readonly"
                            title="Labeler's submission"
                            segments={verifiedSegments}
                            fallbackTranscript={recording.verified_transcript}
                            currentTime={currentTime}
                            onSeek={handleSeek}
                            diffStatuses={diffStatusesLabeler}
                            scrollContainerRef={col2Ref}
                          />
                        </div>
                      }
                      right={
                        <div className="bg-white rounded-md shadow-sm border border-ink/10 flex flex-col min-h-0 overflow-hidden h-full">
                          <TranscriptColumn
                            mode="edit"
                            title="Your edits"
                            segments={ownerEditSegments}
                            fallbackTranscript={recording.verified_transcript}
                            currentTime={currentTime}
                            editingIndex={editingIndex}
                            onSeek={handleSeek}
                            onEditStart={(idx) => {
                              // Column 3 ("Your edits") is index 2 in
                              // [col1Ref, col2Ref, col3Ref]. The hook reads
                              // the segment's data-segment-start to align
                              // Columns 1 and 2 by audio timestamp.
                              scrollToSegment(2, idx)
                              handleEditStart(idx)
                            }}
                            onEditChange={updateOwnerSegmentTranscript}
                            onEditCommit={handleEditCommit}
                            onEditCancel={handleEditCancel}
                            onSpeakerToggle={swapOwnerSegmentSpeaker}
                            diffStatuses={diffStatusesOwner}
                            scrollContainerRef={col3Ref}
                          />
                        </div>
                      }
                    />
                  }
                />
              </div>

              {ownerTags && (
                <div className="flex-none border-t border-ink/10">
                  <CollapsibleTagPanel value={ownerTags} onChange={setOwnerTags} />
                </div>
              )}

              <ScrollSyncToggle
                enabled={scrollSyncEnabled}
                onToggle={() => setScrollSyncEnabled((v) => !v)}
              />

              <div className="flex-none border-t border-ink/10 bg-white px-4 py-3 space-y-2">
                <label className="block">
                  <span className="block text-xs font-semibold text-ink mb-1">
                    Reviewer notes for labeler
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="What was wrong, or why approving?"
                    className="w-full px-3 py-2 border border-ink/20 rounded text-sm resize-y"
                  />
                  <span className="block text-[11px] text-brown mt-1">
                    Required when sending back. Optional when approving.
                  </span>
                </label>
                {actionError && (
                  <p className="text-red-700 text-xs">{actionError}</p>
                )}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => void onSendBack()}
                    disabled={sendBackDisabled}
                    title={sendBackTitle}
                    className="px-4 py-2 rounded border border-yellow-700 text-yellow-800 bg-yellow-50 hover:bg-yellow-100 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionInFlight === 'send_back'
                      ? 'Sending back…'
                      : ownerHasEdits
                        ? 'Send back with edits'
                        : 'Send back'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onApprove()}
                    disabled={actionInFlight !== null}
                    className="px-4 py-2 rounded bg-green-700 text-white hover:bg-green-800 text-sm font-semibold disabled:opacity-50"
                  >
                    {actionInFlight === 'approve'
                      ? 'Approving…'
                      : 'Approve → verified'}
                  </button>
                </div>
              </div>
            </div>
          )}
          </main>
        }
      />
    </div>
  )
}
