'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioPlayer, type AudioPlayerHandle } from './AudioPlayer'
import { KaraokeTranscript } from './KaraokeTranscript'
import { VerifiedEditor } from './VerifiedEditor'
import { TagPanel, type TagPanelValue } from './TagPanel'
import { SaveControls } from './SaveControls'
import { formatDateTime, formatMmSs } from '../lib/formatters'
import type { PatchPayload, RecordingDetail } from '../lib/types'
import type { Status } from '../lib/enums'

interface ReviewPaneProps {
  recording: RecordingDetail | null
  loading: boolean
  error: string | null
  hasNext: boolean
  onSave: (
    payload: PatchPayload,
    options: { advanceAfter: boolean },
  ) => Promise<{ ok: boolean; error?: string }>
}

interface FormState {
  verified_transcript: string
  status: Status
  tags: TagPanelValue
}

function buildInitialState(rec: RecordingDetail): FormState {
  return {
    verified_transcript: rec.verified_transcript ?? rec.machine.transcript ?? '',
    status: rec.status,
    tags: {
      language_profile_tag: rec.language_profile_tag,
      call_type_tag: rec.call_type_tag,
      audio_quality_tag: rec.audio_quality_tag,
      error_tags: [...rec.error_tags],
      contains_menu_items: rec.contains_menu_items,
      contains_prices: rec.contains_prices,
      contains_phone_numbers: rec.contains_phone_numbers,
      contains_names: rec.contains_names,
      is_holdout: rec.is_holdout,
      reviewer_notes: rec.reviewer_notes ?? '',
    },
  }
}

function arraysEqualUnordered<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  for (const item of b) if (!sa.has(item)) return false
  return true
}

function computeDiff(initial: FormState, current: FormState): PatchPayload {
  const diff: PatchPayload = {}
  if (initial.verified_transcript !== current.verified_transcript) {
    diff.verified_transcript = current.verified_transcript
  }
  if (initial.status !== current.status) diff.status = current.status
  const it = initial.tags
  const ct = current.tags
  if (it.language_profile_tag !== ct.language_profile_tag) {
    diff.language_profile_tag = ct.language_profile_tag
  }
  if (it.call_type_tag !== ct.call_type_tag) diff.call_type_tag = ct.call_type_tag
  if (it.audio_quality_tag !== ct.audio_quality_tag) {
    diff.audio_quality_tag = ct.audio_quality_tag
  }
  if (!arraysEqualUnordered(it.error_tags, ct.error_tags)) {
    diff.error_tags = ct.error_tags
  }
  if (it.contains_menu_items !== ct.contains_menu_items) {
    diff.contains_menu_items = ct.contains_menu_items
  }
  if (it.contains_prices !== ct.contains_prices) diff.contains_prices = ct.contains_prices
  if (it.contains_phone_numbers !== ct.contains_phone_numbers) {
    diff.contains_phone_numbers = ct.contains_phone_numbers
  }
  if (it.contains_names !== ct.contains_names) diff.contains_names = ct.contains_names
  if (it.is_holdout !== ct.is_holdout) diff.is_holdout = ct.is_holdout
  if ((it.reviewer_notes || '') !== (ct.reviewer_notes || '')) {
    diff.reviewer_notes = ct.reviewer_notes
  }
  return diff
}

export function ReviewPane({
  recording,
  loading,
  error,
  hasNext,
  onSave,
}: ReviewPaneProps) {
  const initialRef = useRef<FormState | null>(null)
  const [form, setForm] = useState<FormState | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [textFocused, setTextFocused] = useState(false)
  const audioRef = useRef<AudioPlayerHandle | null>(null)

  useEffect(() => {
    if (!recording) {
      initialRef.current = null
      setForm(null)
      setCurrentTime(0)
      setSaveError(null)
      return
    }
    const next = buildInitialState(recording)
    initialRef.current = next
    setForm(next)
    setCurrentTime(0)
    setSaveError(null)
  }, [recording])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 1200)
    return () => clearTimeout(id)
  }, [toast])

  const dirty = useMemo(() => {
    if (!form || !initialRef.current) return false
    return Object.keys(computeDiff(initialRef.current, form)).length > 0
  }, [form])

  const entries = useMemo(
    () => recording?.machine.diarization?.entries ?? [],
    [recording],
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
        void doSave(true)
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
        const prev = [...entries].reverse().find((en) => en.start_time_seconds < t - 0.25)
        if (prev) audio.seekTo(prev.start_time_seconds)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const t = audio.getCurrentTime()
        const nxt = entries.find((en) => en.start_time_seconds > t + 0.05)
        if (nxt) audio.seekTo(nxt.start_time_seconds)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const t = audio.getCurrentTime()
        const cur = entries.find(
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
  }, [doSave, entries, textFocused])

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
          <KaraokeTranscript
            entries={entries}
            fallbackTranscript={recording.machine.transcript}
            currentTime={currentTime}
            onSeek={handleKaraokeSeek}
          />
        </section>
        <hr className="border-ink/10" />
        <VerifiedEditor
          value={form.verified_transcript}
          onChange={(v) =>
            setForm((f) => (f ? { ...f, verified_transcript: v } : f))
          }
          onFocusChange={setTextFocused}
        />
        <hr className="border-ink/10" />
        <TagPanel
          value={form.tags}
          onChange={(tags) => setForm((f) => (f ? { ...f, tags } : f))}
          onTextFocusChange={setTextFocused}
        />
      </div>
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
      />
      {toast && (
        <div className="absolute bottom-20 right-6 px-3 py-2 rounded bg-ink text-cream text-sm shadow-lg">
          {toast}
        </div>
      )}
    </main>
  )
}
