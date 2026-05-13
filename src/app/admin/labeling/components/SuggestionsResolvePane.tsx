'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioPlayer, type AudioPlayerHandle } from './AudioPlayer'
import { CollapsibleTagPanel } from './CollapsibleTagPanel'
import { ResizableSplit } from './ResizableSplit'
import { ScrollSyncToggle } from './ScrollSyncToggle'
import { type TagPanelValue } from './TagPanel'
import { TranscriptColumn } from './TranscriptColumn'
import { useSyncedColumnScroll } from '../hooks/useSyncedColumnScroll'
import { diffSegments } from '../lib/segment-diff'
import { formatMmSs } from '../lib/formatters'
import type {
  PatchPayload,
  RecordingDetail,
  VerifiedSegment,
} from '../lib/types'

// Sarvam emits speaker_id as bare digit strings ("0", "1"). TranscriptColumn
// keys off the "speaker_<n>" form for styling and S1/S2 swap; mirror the
// labeler-page ReviewPane normalization at this boundary.
function normalizeSpeakerId(rawId: string): string {
  return /^\d+$/.test(rawId) ? `speaker_${rawId}` : rawId
}

function cloneSegment(s: VerifiedSegment): VerifiedSegment {
  return {
    speaker_id: normalizeSpeakerId(s.speaker_id),
    transcript: s.transcript,
    start_time_seconds: s.start_time_seconds,
    end_time_seconds: s.end_time_seconds,
    edited_by_user_id: s.edited_by_user_id ?? null,
    edited_at: s.edited_at ?? null,
  }
}

interface SuggestionsResolvePaneProps {
  recording: RecordingDetail
  hasNext: boolean
  onSave: (
    payload: PatchPayload,
    options: { advanceAfter: boolean },
  ) => Promise<{ ok: boolean; error?: string }>
}

export function SuggestionsResolvePane({
  recording,
  onSave,
}: SuggestionsResolvePaneProps) {
  // Read-only baselines derived from the API row. Memoised on the
  // identity of the recording so they only rebuild on row change.
  const labelerPreviousSegments = useMemo<VerifiedSegment[]>(
    () => (recording.verified_segments ?? []).map(cloneSegment),
    [recording],
  )
  const ownerSuggestedSegments = useMemo<VerifiedSegment[] | null>(() => {
    if (!recording.owner_segments) return null
    return recording.owner_segments.map(cloneSegment)
  }, [recording])
  const ownerNotes = recording.reviewer_notes_for_labeler ?? ''
  const hasOwnerSegments = ownerSuggestedSegments !== null

  // Mutable working state. Column 3 starts contextual:
  //   owner_segments present  -> clone of owner_segments (labeler can revert
  //                              per-segment to their own via Use mine).
  //   owner_segments null     -> clone of labeler's previous submission
  //                              (labeler edits based on notes only).
  // The same logic re-runs whenever a new recording loads.
  const [resolvedSegments, setResolvedSegments] = useState<VerifiedSegment[]>(
    () => (ownerSuggestedSegments ?? labelerPreviousSegments).map(cloneSegment),
  )
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const preEditRef = useRef<string>('')
  const [currentTime, setCurrentTime] = useState(0)
  const audioRef = useRef<AudioPlayerHandle | null>(null)

  // Tags. Editable on the labeler side; included in the Resubmit payload
  // per architect lean. Note: as of Commit 2 the backend's labeler-resolve
  // branch does NOT yet persist tag fields from the payload. Flagged as a
  // followup; frontend ships correct so the backend can drop the fix in
  // without touching the UI.
  const [tags, setTags] = useState<TagPanelValue>(() => ({
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
  }))

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Bidirectional scroll sync (Commit 5.7). Mirrors the reviewer page.
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(false)
  const col1Ref = useRef<HTMLDivElement | null>(null)
  const col2Ref = useRef<HTMLDivElement | null>(null)
  const col3Ref = useRef<HTMLDivElement | null>(null)
  const { scrollToSegment } = useSyncedColumnScroll({
    enabled: scrollSyncEnabled,
    columnRefs: [col1Ref, col2Ref, col3Ref],
  })

  // Reset working state whenever the recording changes.
  useEffect(() => {
    setResolvedSegments(
      (ownerSuggestedSegments ?? labelerPreviousSegments).map(cloneSegment),
    )
    setEditingIndex(null)
    setCurrentTime(0)
    setSaveError(null)
    setTags({
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
  }, [recording, labelerPreviousSegments, ownerSuggestedSegments])

  // Diff statuses for columns 2 and 3.
  const diffStatusesCol2 = useMemo(() => {
    if (!hasOwnerSegments || !ownerSuggestedSegments) return undefined
    return diffSegments(labelerPreviousSegments, ownerSuggestedSegments)
      .perSegmentStatus
  }, [hasOwnerSegments, labelerPreviousSegments, ownerSuggestedSegments])

  const diffStatusesCol3 = useMemo(() => {
    const baseline = ownerSuggestedSegments ?? labelerPreviousSegments
    return diffSegments(baseline, resolvedSegments).perSegmentStatus
  }, [labelerPreviousSegments, ownerSuggestedSegments, resolvedSegments])

  // ── Edit-lifecycle handlers (Column 3) ──────────────────────────────────

  const handleEditStart = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= resolvedSegments.length) return
      preEditRef.current = resolvedSegments[idx].transcript
      setEditingIndex(idx)
    },
    [resolvedSegments],
  )

  const updateResolvedTranscript = useCallback(
    (idx: number, transcript: string) => {
      setResolvedSegments((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, transcript } : s)),
      )
    },
    [],
  )

  const handleEditCommit = useCallback(() => {
    setEditingIndex(null)
  }, [])

  const handleEditCancel = useCallback((idx: number) => {
    setResolvedSegments((prev) =>
      prev.map((s, i) =>
        i === idx ? { ...s, transcript: preEditRef.current } : s,
      ),
    )
    setEditingIndex(null)
  }, [])

  const swapResolvedSpeaker = useCallback((idx: number) => {
    setResolvedSegments((prev) =>
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

  const handleUseFromAlternative = useCallback(
    (idx: number, source: 'mine' | 'theirs') => {
      const sourceArray =
        source === 'mine' ? labelerPreviousSegments : ownerSuggestedSegments
      if (!sourceArray) return
      const replacement = sourceArray[idx]
      if (!replacement) return
      setResolvedSegments((prev) =>
        prev.map((s, i) => (i === idx ? cloneSegment(replacement) : s)),
      )
    },
    [labelerPreviousSegments, ownerSuggestedSegments],
  )

  // ── Resubmit action ────────────────────────────────────────────────────

  const handleResubmit = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    const payload: PatchPayload = {
      resolved_segments: resolvedSegments,
      // Tag fields. Sent for forward-compat; backend labeler-resolve
      // branch currently ignores them (Commit 2 scope). Followup will
      // wire the backend to persist these here too.
      error_tags: tags.error_tags,
      language_profile_tag: tags.language_profile_tag,
      call_type_tag: tags.call_type_tag,
      audio_quality_tag: tags.audio_quality_tag,
      contains_menu_items: tags.contains_menu_items,
      contains_prices: tags.contains_prices,
      contains_phone_numbers: tags.contains_phone_numbers,
      contains_names: tags.contains_names,
      is_holdout: tags.is_holdout,
      reviewer_notes: tags.reviewer_notes,
    }
    // advanceAfter=false: the row leaves the suggestions_pending bucket
    // and selection naturally drops. The parent's findNextAutoLabeled
    // logic only advances among auto_labeled rows, which is not what we
    // want here.
    const result = await onSave(payload, { advanceAfter: false })
    setSaving(false)
    if (!result.ok) {
      setSaveError(result.error ?? 'Resubmit failed')
    }
  }, [saving, resolvedSegments, tags, onSave])

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-cream relative">
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
            <span className="text-ink/60">Tenant</span> {recording.tenant_name}
          </span>
          <span>
            <span className="text-ink/60">Duration</span>{' '}
            {formatMmSs(recording.recording.duration_seconds)}
          </span>
          <span className="text-yellow-800 font-semibold">
            Sent back for your review
          </span>
        </div>
      </div>

      {ownerNotes ? (
        <div className="flex-none border-b border-ink/10 bg-yellow-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-yellow-900 mb-1">
            Owner&apos;s notes
          </div>
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {ownerNotes}
          </p>
        </div>
      ) : null}

      <div className="flex-1 min-h-0 p-2 overflow-hidden">
        <ResizableSplit
          className="h-full"
          initialLeftWidth="33.33%"
          minWidth={200}
          left={
            <div className="bg-white rounded-md shadow-sm border border-ink/10 flex flex-col min-h-0 overflow-hidden h-full">
              <TranscriptColumn
                mode="readonly"
                title="Your previous submission"
                segments={labelerPreviousSegments}
                fallbackTranscript={recording.verified_transcript}
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
                  {hasOwnerSegments && ownerSuggestedSegments ? (
                    <TranscriptColumn
                      mode="readonly"
                      title="Owner's suggestions"
                      segments={ownerSuggestedSegments}
                      fallbackTranscript={recording.machine.transcript}
                      currentTime={currentTime}
                      onSeek={handleSeek}
                      diffStatuses={diffStatusesCol2}
                      scrollContainerRef={col2Ref}
                    />
                  ) : (
                    <div ref={col2Ref} className="px-4 py-3 h-full flex flex-col overflow-y-auto">
                      <h3 className="text-sm font-semibold text-ink mb-2 sticky top-0 bg-white z-10 -mx-4 px-4 -mt-3 pt-3 pb-2 border-b border-ink/10 shadow-sm">
                        Owner sent this back with notes only
                      </h3>
                      <p className="text-sm text-brown mt-4">
                        The owner did not edit any segments. Read the notes above and
                        edit your working copy on the right based on the guidance.
                      </p>
                    </div>
                  )}
                </div>
              }
              right={
                <div className="bg-white rounded-md shadow-sm border border-ink/10 flex flex-col min-h-0 overflow-hidden h-full">
                  <TranscriptColumn
                    mode="suggesting"
                    title="Your working copy"
                    segments={resolvedSegments}
                    fallbackTranscript={recording.verified_transcript}
                    currentTime={currentTime}
                    editingIndex={editingIndex}
                    onSeek={handleSeek}
                    onEditStart={(idx) => {
                      // Column 3 ("Your working copy") is index 2 in
                      // [col1Ref, col2Ref, col3Ref]. The hook reads the
                      // segment's data-segment-start to align Columns 1
                      // and 2 by audio timestamp.
                      scrollToSegment(2, idx)
                      handleEditStart(idx)
                    }}
                    onEditChange={updateResolvedTranscript}
                    onEditCommit={handleEditCommit}
                    onEditCancel={handleEditCancel}
                    onSpeakerToggle={swapResolvedSpeaker}
                    diffStatuses={diffStatusesCol3}
                    alternativeMine={labelerPreviousSegments}
                    alternativeTheirs={ownerSuggestedSegments ?? undefined}
                    onUseSegmentFromAlternative={handleUseFromAlternative}
                    scrollContainerRef={col3Ref}
                  />
                </div>
              }
            />
          }
        />
      </div>

      <div className="flex-none border-t border-ink/10">
        <CollapsibleTagPanel value={tags} onChange={setTags} />
      </div>

      <ScrollSyncToggle
        enabled={scrollSyncEnabled}
        onToggle={() => setScrollSyncEnabled((v) => !v)}
      />

      <div className="flex-none border-t border-ink/10 bg-white px-4 py-3 flex items-center justify-end gap-3">
        {saveError ? (
          <p className="text-red-700 text-xs mr-auto">{saveError}</p>
        ) : null}
        <button
          type="button"
          onClick={() => void handleResubmit()}
          disabled={saving || resolvedSegments.length === 0}
          className="px-4 py-2 rounded bg-terra text-white hover:bg-terra-dark text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Resubmitting…' : 'Resubmit for review'}
        </button>
      </div>
    </main>
  )
}
