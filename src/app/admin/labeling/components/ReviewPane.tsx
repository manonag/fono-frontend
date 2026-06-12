'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioPlayer, type AudioPlayerHandle } from './AudioPlayer'
import { TranscriptColumn } from './TranscriptColumn'
import { VerifiedEditor } from './VerifiedEditor'
import { CollapsibleTagPanel } from './CollapsibleTagPanel'
import { SaveControls } from './SaveControls'
import { LabelerSaveControls } from './LabelerSaveControls'
import { SuggestionsResolvePane } from './SuggestionsResolvePane'
import { ownsClaim as computeOwnsClaim } from '../lib/claim-ownership'
import {
  buildState,
  computeDiff,
  mergeSegmentsAt,
  splitSegmentAtWord,
  swapAllSegmentSpeakers,
  toggleSegmentSpeakerAt,
  type FormState,
  type InitialSnapshot,
} from '../lib/review-form'
import { ConfirmModal } from '@/components/confirm-modal'
import { formatDateTime, formatMmSs } from '../lib/formatters'
import type { PatchPayload, RecordingDetail } from '../lib/types'

interface ReviewPaneProps {
  recording: RecordingDetail | null
  loading: boolean
  error: string | null
  hasNext: boolean
  onSave: (
    payload: PatchPayload,
    options: { advanceAfter: boolean },
  ) => Promise<{ ok: boolean; error?: string }>
  // T-2d16e333: recovery demote action. Parent issues an independent
  // PATCH on the currently-selected row. Returns ok / error so the
  // pane can surface a toast or inline error.
  onDemote: (
    target: 'auto_labeled' | 'verified',
  ) => Promise<{ ok: boolean; error?: string }>
  // Sprint 1 bulk speaker swap. Parent POSTs to the swap endpoint and
  // refetches the recording on success (mirrors handleDemote). Returns
  // ok / error so the pane can surface a toast or inline error.
  onSwapSpeakers: () => Promise<{ ok: boolean; error?: string }>
  // Phase C.3 Sprint 1. role drives the control bar: 'labeler' gets
  // Submit for review / Release back to queue (no status dropdown);
  // 'owner' keeps the existing SaveControls. onRelease releases the claim
  // on the currently selected recording (labeler only).
  role: 'owner' | 'labeler'
  onRelease: () => Promise<{ ok: boolean; error?: string }>
  // Current user id, to gate owned-claim actions (swap) on the loaded
  // recording's claimed_by_user_id.
  currentUserId: string | null
}

export function ReviewPane({
  recording,
  loading,
  error,
  hasNext,
  onSave,
  onDemote,
  onSwapSpeakers,
  role,
  onRelease,
  currentUserId,
}: ReviewPaneProps) {
  const isLabeler = role === 'labeler'
  const initialRef = useRef<InitialSnapshot | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const preEditRef = useRef<string>('')
  const [currentTime, setCurrentTime] = useState(0)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [demoting, setDemoting] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [showSwapConfirm, setShowSwapConfirm] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [textFocused, setTextFocused] = useState(false)
  const audioRef = useRef<AudioPlayerHandle | null>(null)

  useEffect(() => {
    if (!recording) {
      initialRef.current = null
      setForm(null)
      setEditingIndex(null)
      setCurrentTime(0)
      setSaveError(null)
      return
    }
    const { form: nextForm, initial } = buildState(recording, isLabeler)
    initialRef.current = initial
    setForm(nextForm)
    setEditingIndex(null)
    setCurrentTime(0)
    setSaveError(null)
  }, [recording, isLabeler])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 1200)
    return () => clearTimeout(id)
  }, [toast])

  const dirty = useMemo(() => {
    if (!form || !initialRef.current) return false
    return Object.keys(computeDiff(initialRef.current, form)).length > 0
  }, [form])

  const segments = useMemo(
    () => form?.verified_segments ?? [],
    [form],
  )

  const derivedVerifiedText = useMemo(
    () => segments.map((s) => s.transcript).join(' ').trim(),
    [segments],
  )

  const updateSegmentTranscript = useCallback((idx: number, transcript: string) => {
    setForm((f) => {
      if (!f) return f
      const next = f.verified_segments.map((s, i) =>
        i === idx ? { ...s, transcript } : s,
      )
      return { ...f, verified_segments: next }
    })
  }, [])

  const toggleSegmentSpeaker = useCallback((idx: number) => {
    setForm((f) =>
      f
        ? { ...f, verified_segments: toggleSegmentSpeakerAt(f.verified_segments, idx) }
        : f,
    )
  }, [])

  // Client-side Swap all speakers: flip every S1<->S2 segment in the form
  // (the effective working layer), marking the form dirty. Submit/Save then
  // persists. Replaces the server swap on a fresh row, which flips the empty
  // server verified_segments and is a silent no-op.
  const swapAllFormSpeakers = useCallback(() => {
    setForm((f) =>
      f
        ? { ...f, verified_segments: swapAllSegmentSpeakers(f.verified_segments) }
        : f,
    )
  }, [])

  // Split-segment tool: split the segment at a word boundary (second piece
  // defaults to the other speaker); merge rejoins a piece into the one above.
  // Both mutate the form working layer and mark it dirty; Submit/Save persists.
  const handleSplitSegment = useCallback((idx: number, wordIdx: number) => {
    setForm((f) =>
      f
        ? { ...f, verified_segments: splitSegmentAtWord(f.verified_segments, idx, wordIdx) }
        : f,
    )
  }, [])

  const handleMergeWithPrevious = useCallback((idx: number) => {
    setForm((f) =>
      f
        ? { ...f, verified_segments: mergeSegmentsAt(f.verified_segments, idx) }
        : f,
    )
  }, [])

  const handleEditStart = useCallback(
    (idx: number) => {
      if (!form) return
      preEditRef.current = form.verified_segments[idx]?.transcript ?? ''
      setEditingIndex(idx)
    },
    [form],
  )

  const handleEditCommit = useCallback(() => {
    setEditingIndex(null)
  }, [])

  const handleEditCancel = useCallback(
    (idx: number) => {
      updateSegmentTranscript(idx, preEditRef.current)
      setEditingIndex(null)
    },
    [updateSegmentTranscript],
  )

  const doSave = useCallback(
    async (advanceAfter: boolean) => {
      if (!form || !initialRef.current) return
      const diff = computeDiff(initialRef.current, form)
      if (Object.keys(diff).length === 0 && !advanceAfter) return
      setSaving(true)
      setSaveError(null)
      const result = await onSave(diff, { advanceAfter })
      setSaving(false)
      if (result.ok) {
        setToast('Saved')
      } else {
        setSaveError(result.error ?? 'Save failed')
      }
    },
    [form, onSave],
  )

  // Labeler Submit for review. Always sends verified_segments (even when
  // unchanged) so the PATCH fires and the backend forces in_review +
  // releases the claim; reviewing a correct machine transcript and
  // submitting is a valid no-edit action. Tags ride along when changed.
  const doSubmit = useCallback(async () => {
    if (!form || !initialRef.current) return
    const payload: PatchPayload = {
      ...computeDiff(initialRef.current, form),
      verified_segments: form.verified_segments,
    }
    setSubmitting(true)
    setSaveError(null)
    const result = await onSave(payload, { advanceAfter: true })
    setSubmitting(false)
    if (result.ok) {
      setToast('Submitted for review')
    } else {
      setSaveError(result.error ?? 'Submit failed')
    }
  }, [form, onSave])

  // Labeler Release back to queue. Clears the claim; the page refetches and
  // moves on. Independent of form dirty state (edits stay on the recording).
  const doRelease = useCallback(async () => {
    setReleasing(true)
    setSaveError(null)
    const result = await onRelease()
    setReleasing(false)
    if (result.ok) {
      setToast('Released back to queue')
    } else {
      setSaveError(result.error ?? 'Release failed')
    }
  }, [onRelease])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (textFocused) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const audio = audioRef.current
      if (!audio) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (isLabeler) {
          void doSubmit()
        } else {
          void doSave(true)
        }
        return
      }

      if (e.key === ' ') {
        e.preventDefault()
        audio.toggle()
        return
      }
      if (e.key === 'j' || e.key === 'J') {
        e.preventDefault()
        audio.seekBy(-3)
        return
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault()
        audio.seekBy(3)
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const t = audio.getCurrentTime()
        const prev = [...segments]
          .reverse()
          .find((en) => en.start_time_seconds < t - 0.25)
        if (prev) audio.seekTo(prev.start_time_seconds)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const t = audio.getCurrentTime()
        const nxt = segments.find((en) => en.start_time_seconds > t + 0.05)
        if (nxt) audio.seekTo(nxt.start_time_seconds)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const t = audio.getCurrentTime()
        const cur = segments.find(
          (en) => t >= en.start_time_seconds && t < en.end_time_seconds,
        )
        if (cur) {
          audio.seekTo(cur.start_time_seconds)
          void audio.play()
        }
        return
      }
      if (e.key === '1') {
        audio.setRate(0.75)
        return
      }
      if (e.key === '2') {
        audio.setRate(1)
        return
      }
      if (e.key === '3') {
        audio.setRate(1.25)
        return
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doSave, doSubmit, isLabeler, segments, textFocused])

  if (loading && !recording) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-brown text-sm">Loading recording…</p>
      </main>
    )
  }
  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-red-700 text-sm">{error}</p>
      </main>
    )
  }
  if (!recording || !form) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <p className="text-brown text-sm">Select a recording from the queue.</p>
      </main>
    )
  }

  // Branch into the labeler suggestions-handling view when the owner has
  // sent this row back. The regular labeler workspace below is bypassed;
  // all the form/save lifecycle still runs (cheap, no observable effects)
  // but the pane Mourya sees is the three-column resolve view.
  if (recording.status === 'suggestions_pending') {
    return (
      <SuggestionsResolvePane
        recording={recording}
        hasNext={hasNext}
        onSave={onSave}
      />
    )
  }

  const handleKaraokeSeek = (s: number) => {
    audioRef.current?.seekTo(s)
    void audioRef.current?.play()
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-cream relative">
      <div className="flex-none">
        <AudioPlayer
          ref={audioRef}
          src={recording.recording.audio_url}
          onTimeUpdate={setCurrentTime}
        />
        <div className="px-4 py-2 bg-white border-b border-ink/10 text-xs text-brown flex flex-wrap gap-x-4 gap-y-1 font-mono">
          <span>
            <span className="text-ink/60">Recording</span>{' '}
            {recording.recording_id.slice(0, 8)}…
          </span>
          <span>
            <span className="text-ink/60">Tenant</span> {recording.tenant_name}
          </span>
          <span>
            <span className="text-ink/60">Started</span>{' '}
            {formatDateTime(recording.call.started_at)}
          </span>
          <span>
            <span className="text-ink/60">Duration</span>{' '}
            {formatMmSs(recording.recording.duration_seconds)}
          </span>
          <span>
            <span className="text-ink/60">Sarvam lang</span>{' '}
            {recording.machine.language_code ?? '—'}
          </span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <section>
          <h3 className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-brown">
            Karaoke Transcript
          </h3>
          <TranscriptColumn
            mode="edit"
            segments={segments}
            fallbackTranscript={recording.machine.transcript}
            currentTime={currentTime}
            editingIndex={editingIndex}
            onSeek={handleKaraokeSeek}
            onEditStart={handleEditStart}
            onEditChange={updateSegmentTranscript}
            onEditCommit={handleEditCommit}
            onEditCancel={handleEditCancel}
            onSpeakerToggle={toggleSegmentSpeaker}
            onSplitSegment={handleSplitSegment}
            onMergeWithPrevious={handleMergeWithPrevious}
          />
        </section>
        <hr className="border-ink/10" />
        <VerifiedEditor value={derivedVerifiedText} />
        <hr className="border-ink/10" />
        <CollapsibleTagPanel
          value={form.tags}
          onChange={(tags) => setForm((f) => (f ? { ...f, tags } : f))}
          onTextFocusChange={setTextFocused}
        />
      </div>
      {isLabeler ? (
        <LabelerSaveControls
          submitting={submitting}
          releasing={releasing}
          saveError={saveError}
          hasNext={hasNext}
          onSubmit={() => void doSubmit()}
          onRelease={() => void doRelease()}
          swapping={swapping}
          ownsClaim={computeOwnsClaim(recording.claimed_by_user_id, currentUserId)}
          onSwapAllSpeakers={
            recording.status === 'auto_labeled' || recording.status === 'in_review'
              ? () => setShowSwapConfirm(true)
              : undefined
          }
        />
      ) : (
        <SaveControls
        status={form.status}
        initialStatus={initialRef.current?.status ?? form.status}
        dirty={dirty}
        saving={saving}
        saveError={saveError}
        onStatusChange={(status) =>
          setForm((f) => (f ? { ...f, status } : f))
        }
        onSave={() => void doSave(false)}
        onSaveAndNext={() => void doSave(true)}
        hasNext={hasNext}
        demoting={demoting}
        onDemote={(target) => {
          // T-2d16e333: recovery demote. Independent of form save flow.
          // Form state stays as-is in the UI; parent refetches the
          // recording after the PATCH lands, which rebuilds the form
          // via the recording-loaded effect.
          setDemoting(true)
          setSaveError(null)
          void onDemote(target).then((result) => {
            setDemoting(false)
            if (result.ok) {
              setToast(target === 'auto_labeled' ? 'Sent back to Pending' : 'Demoted to Verified')
            } else {
              setSaveError(result.error ?? 'Demote failed')
            }
          })
        }}
        // Sprint 1: only surface swap-all on rows the backend will accept
        // (auto_labeled, in_review). suggestions_pending takes the
        // SuggestionsResolvePane branch above; verified/gold need a
        // demote-first roundtrip per the backend status guard.
        onSwapAllSpeakers={
          recording.status === 'auto_labeled' || recording.status === 'in_review'
            ? () => setShowSwapConfirm(true)
            : undefined
        }
        swapping={swapping}
      />
      )}
      <ConfirmModal
        open={showSwapConfirm}
        title="Swap all speakers?"
        description="This flips S1 and S2 for the ENTIRE recording. Use only when the whole recording is reversed, not for partial mislabels."
        confirmLabel="Swap all"
        cancelLabel="Cancel"
        variant="warning"
        onCancel={() => setShowSwapConfirm(false)}
        onConfirm={() => {
          setShowSwapConfirm(false)
          if (isLabeler) {
            // Client-side flip on the form working layer; Submit persists.
            // Instant, reversible, and correct on fresh (empty-server) rows.
            swapAllFormSpeakers()
            setToast('Speakers swapped')
          } else {
            // Owner: keep the server swap (persists immediately on the
            // already-saved verified_segments and refetches).
            setSwapping(true)
            setSaveError(null)
            void onSwapSpeakers().then((result) => {
              setSwapping(false)
              if (result.ok) {
                setToast('Speakers swapped')
              } else {
                setSaveError(result.error ?? 'Swap failed')
              }
            })
          }
        }}
      />
      {toast && (
        <div className="absolute bottom-20 right-6 px-3 py-2 rounded bg-ink text-cream text-sm shadow-lg">
          {toast}
        </div>
      )}
    </main>
  )
}
