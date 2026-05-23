'use client'

import { useEffect, useRef, useState } from 'react'
import { AudioPlayer, type AudioPlayerHandle } from '../components/AudioPlayer'
import { TranscriptColumn } from '../components/TranscriptColumn'
import { formatMmSs } from '../lib/formatters'
import { AdjudicationApiError, fetchAudio } from './lib/api'
import {
  CORRECTION_LABELS,
  type AdjudicationRow,
  type AudioResolution,
  type CorrectionLabel,
  type RulingVerb,
} from './lib/types'

interface AdjudicatePaneProps {
  row: AdjudicationRow | null
  token: string
  saving: 'save' | 'save-next' | null
  saveError: string | null
  hasNext: boolean
  onSave: (input: {
    verb: RulingVerb
    correctTo: CorrectionLabel | null
    note: string
    advance: boolean
  }) => Promise<void>
}

const TAG_STYLES: Record<string, string> = {
  PROMPT: 'bg-danger/15 text-danger',
  CONTESTABLE_GOLD: 'bg-warning/20 text-ink',
  BOUNDARY: 'bg-ink/10 text-brown',
}

function TagBadge({ tag }: { tag: string }) {
  if (!tag) return null
  const cls = TAG_STYLES[tag] ?? 'bg-ink/10 text-brown'
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {tag}
    </span>
  )
}

export function AdjudicatePane({
  row,
  token,
  saving,
  saveError,
  hasNext,
  onSave,
}: AdjudicatePaneProps) {
  const audioRef = useRef<AudioPlayerHandle | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [audio, setAudio] = useState<AudioResolution | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  // Ruling form state. Resets on row change so a previously ruled row
  // starts with a blank verb (the user must re-engage to re-rule). The
  // ruled-state badge on the queue conveys whether a row already has
  // a ruling on the overlay.
  const [verb, setVerb] = useState<RulingVerb | null>(null)
  const [correctTo, setCorrectTo] = useState<CorrectionLabel | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    setVerb(null)
    setCorrectTo(null)
    setNote('')
    setCurrentTime(0)
    setAudio(null)
    setAudioError(null)
    if (!row) return
    let cancelled = false
    setAudioLoading(true)
    fetchAudio(token, row.row_id)
      .then((res) => {
        if (cancelled) return
        setAudio(res)
        if (!res.available && res.reason) setAudioError(res.reason)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg =
          err instanceof AdjudicationApiError
            ? err.detail
            : 'Failed to resolve audio'
        setAudioError(msg)
      })
      .finally(() => {
        if (!cancelled) setAudioLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [row, token])

  const handleSeek = (seconds: number) => {
    audioRef.current?.seekTo(seconds)
    void audioRef.current?.play()
  }

  if (!row) {
    return (
      <main className="flex-1 flex flex-col min-h-0 bg-cream items-center justify-center">
        <p className="text-brown text-sm">Select a row from the queue.</p>
      </main>
    )
  }

  const goldLabel = row.gold || '?'
  const predLabel = row.predicted || '?'
  const segments = row.segments ?? []

  const canSave =
    verb === 'KEEP' ||
    verb === 'UNSCOREABLE' ||
    (verb === 'CORRECT' && correctTo !== null)

  const handleSaveClick = (advance: boolean) => {
    if (!verb) return
    if (verb === 'CORRECT' && !correctTo) return
    void onSave({ verb, correctTo, note: note.trim(), advance })
  }

  return (
    <main className="flex-1 flex flex-col min-h-0 bg-cream overflow-hidden">
      {/* Guidance banner: tag, id, recording, duration, gold->pred, model
          reason, listen_for. Sits above the transcript per wireframe. */}
      <div className="flex-none border-b border-ink/10 bg-white px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <TagBadge tag={row.tag} />
          <span className="font-mono text-sm font-semibold text-ink">
            {row.display_id}
          </span>
          <span className="text-xs text-brown">
            recording{' '}
            <span className="font-mono">
              {row.recording_id ? row.recording_id.slice(0, 8) + '...' : 'none'}
            </span>
          </span>
          <span className="text-xs text-brown font-mono">
            {row.duration != null ? formatMmSs(row.duration) : '-:--'}
          </span>
        </div>
        <div className="text-sm text-ink mb-1">
          gold{' '}
          <span className="font-mono font-semibold">{goldLabel}</span>
          <span className="text-brown mx-2">{'->'}</span>
          predicted{' '}
          <span className="font-mono font-semibold">{predLabel}</span>
        </div>
        {row.model_reason && (
          <div className="text-xs text-brown mb-1">
            <span className="font-semibold text-ink">Model reason:</span>{' '}
            {row.model_reason}
          </div>
        )}
        {row.listen_for && (
          <div className="text-xs text-ink bg-warning/10 rounded px-2 py-1 mt-1">
            <span className="font-semibold">Listen for:</span> {row.listen_for}
          </div>
        )}
        {row.note && !row.listen_for && (
          <div className="text-xs text-brown italic mt-1">{row.note}</div>
        )}
      </div>

      {/* Audio player. Unmounts/remounts on row change so the previous
          row's audio cannot bleed into the new one's currentTime. */}
      <div className="flex-none">
        {audioLoading && (
          <div className="px-4 py-3 text-xs text-brown bg-white border-b border-ink/10">
            Resolving audio...
          </div>
        )}
        {!audioLoading && audio?.available && audio.audio_url && (
          <AudioPlayer
            ref={audioRef}
            src={audio.audio_url}
            onTimeUpdate={setCurrentTime}
          />
        )}
        {!audioLoading && audio && !audio.available && (
          <div className="px-4 py-3 text-xs text-red-700 bg-red-50 border-b border-red-200">
            {audioError || 'Audio not available for this row.'}
          </div>
        )}
      </div>

      {/* Single-pane karaoke transcript. TranscriptColumn drives activeIdx
          internally from currentTime; #284 cross-column scroll sync does
          not apply here. Speaker ids arrive normalized from fetchRows so
          #246 (S1/S2 attribution) holds before this renderer sees them. */}
      <div className="flex-1 min-h-0 p-3 overflow-hidden">
        <div className="bg-white rounded-md shadow-sm border border-ink/10 h-full flex flex-col min-h-0 overflow-hidden">
          <TranscriptColumn
            mode="readonly"
            title="Transcript"
            segments={segments}
            fallbackTranscript={row.transcript}
            currentTime={currentTime}
            onSeek={handleSeek}
          />
        </div>
      </div>

      {/* Ruling bar: Keep gold (current label) | Correct to... (6-category
          taxonomy + FILTERED) | Unscoreable, then optional Note, then
          Save / Save & next. */}
      <div className="flex-none border-t border-ink/10 bg-white px-4 py-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setVerb('KEEP')}
            className={
              verb === 'KEEP'
                ? 'px-3 py-1.5 rounded text-sm font-semibold bg-green-700 text-white'
                : 'px-3 py-1.5 rounded text-sm font-medium border border-ink/20 text-ink hover:bg-ink/5'
            }
          >
            Keep gold ({goldLabel})
          </button>
          <span className="text-brown text-sm">|</span>
          <button
            type="button"
            onClick={() => {
              setVerb('CORRECT')
              if (correctTo === null) setCorrectTo(null)
            }}
            className={
              verb === 'CORRECT'
                ? 'px-3 py-1.5 rounded text-sm font-semibold bg-terra text-white'
                : 'px-3 py-1.5 rounded text-sm font-medium border border-ink/20 text-ink hover:bg-ink/5'
            }
          >
            Correct to...
          </button>
          {verb === 'CORRECT' && (
            <select
              value={correctTo ?? ''}
              onChange={(e) =>
                setCorrectTo(
                  (e.target.value || null) as CorrectionLabel | null,
                )
              }
              className="px-2 py-1.5 text-sm border border-ink/20 rounded bg-white"
            >
              <option value="">Choose...</option>
              {CORRECTION_LABELS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          )}
          <span className="text-brown text-sm">|</span>
          <button
            type="button"
            onClick={() => setVerb('UNSCOREABLE')}
            className={
              verb === 'UNSCOREABLE'
                ? 'px-3 py-1.5 rounded text-sm font-semibold bg-ink text-cream'
                : 'px-3 py-1.5 rounded text-sm font-medium border border-ink/20 text-ink hover:bg-ink/5'
            }
          >
            Unscoreable
          </button>
        </div>
        <label className="block">
          <span className="block text-xs font-semibold text-ink mb-1">
            Note (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Why this ruling? (optional)"
            className="w-full px-3 py-2 border border-ink/20 rounded text-sm resize-y"
          />
        </label>
        {saveError && <p className="text-red-700 text-xs">{saveError}</p>}
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            disabled={!canSave || saving !== null}
            onClick={() => handleSaveClick(false)}
            className="px-4 py-2 rounded border border-ink/20 text-ink bg-white hover:bg-ink/5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving === 'save' ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            disabled={!canSave || saving !== null || !hasNext}
            title={!hasNext ? 'No next row in current filter' : undefined}
            onClick={() => handleSaveClick(true)}
            className="px-4 py-2 rounded bg-terra hover:bg-terra-dark text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving === 'save-next' ? 'Saving...' : 'Save & next'}
          </button>
        </div>
      </div>
    </main>
  )
}
