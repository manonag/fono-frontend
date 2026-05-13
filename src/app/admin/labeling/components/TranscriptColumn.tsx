'use client'

import { useEffect, useMemo, useRef } from 'react'
import { speakerLabel } from '../lib/formatters'
import type { SegmentDiffStatus } from '../lib/segment-diff'
import { diffStatusToTailwindClass } from '../lib/segment-diff'
import type { VerifiedSegment } from '../lib/types'

export type TranscriptMode = 'edit' | 'readonly' | 'suggesting'

interface TranscriptColumnProps {
  segments: VerifiedSegment[]
  mode: TranscriptMode
  fallbackTranscript: string | null
  currentTime: number
  onSeek: (seconds: number) => void

  // Edit-mode props. The existing labeler page wires the same edit
  // lifecycle hooks that KaraokeTranscript used pre-refactor; they are
  // optional so a mode='readonly' caller does not have to stub them.
  editingIndex?: number | null
  onEditStart?: (index: number) => void
  onEditChange?: (index: number, transcript: string) => void
  onEditCommit?: () => void
  onEditCancel?: (index: number) => void
  onSpeakerToggle?: (index: number) => void

  // Optional column header (rendered as a sticky h3 above the segment
  // list).
  title?: string

  // Optional per-segment diff status from diffSegments(); when provided,
  // each row gets the diff Tailwind class from diffStatusToTailwindClass.
  diffStatuses?: SegmentDiffStatus[]

  // Suggesting-mode alternatives. When mode === 'suggesting' and both
  // alternativeMine / alternativeTheirs are provided, each segment whose
  // current value differs from the corresponding alternative gets a small
  // "Use mine" or "Use owner's" text button under the speaker pill. The
  // button fires onUseSegmentFromAlternative(index, source) and the
  // parent decides what segment to substitute. In notes-only send-back,
  // pass undefined for alternativeTheirs to suppress the "Use owner's"
  // button entirely.
  alternativeMine?: VerifiedSegment[]
  alternativeTheirs?: VerifiedSegment[]
  onUseSegmentFromAlternative?: (index: number, source: 'mine' | 'theirs') => void

  // Optional external ref to the scrollable container. Used by
  // useSyncedColumnScroll on the reviewer + suggestions pages to
  // listen for scroll events on each column and align siblings by
  // segment index. When omitted, an internal ref is used (legacy
  // behavior; the labeler workspace mode='edit' caller does not need
  // sync). Structural type avoids React.RefObject's readonly current.
  scrollContainerRef?: { current: HTMLDivElement | null }
}

function segmentsEqualForDiff(
  a: VerifiedSegment | undefined,
  b: VerifiedSegment | undefined,
): boolean {
  if (!a || !b) return false
  return a.transcript === b.transcript && a.speaker_id === b.speaker_id
}

interface SpeakerStyles {
  pill: string
  pillHover: string
  active: string
  swap: string
}

const STYLES_S1: SpeakerStyles = {
  pill: 'bg-[#FDE3D4] text-terra',
  pillHover: 'hover:bg-[#FBD0B6]',
  active: 'bg-[#FDE3D4]/60',
  swap: 'text-terra hover:bg-terra/15',
}
const STYLES_S2: SpeakerStyles = {
  pill: 'bg-teal-100 text-teal-700',
  pillHover: 'hover:bg-teal-200',
  active: 'bg-teal-100/60',
  swap: 'text-teal-700 hover:bg-teal-200',
}
const STYLES_DEFAULT: SpeakerStyles = {
  pill: 'bg-ink/10 text-brown',
  pillHover: 'hover:bg-ink/15',
  active: 'bg-ink/5',
  swap: 'text-brown hover:bg-ink/10',
}

function stylesFor(speakerId: string): SpeakerStyles {
  if (speakerId === 'speaker_0') return STYLES_S1
  if (speakerId === 'speaker_1') return STYLES_S2
  return STYLES_DEFAULT
}

function isToggleable(speakerId: string): boolean {
  return speakerId === 'speaker_0' || speakerId === 'speaker_1'
}

export function TranscriptColumn({
  segments,
  mode,
  fallbackTranscript,
  currentTime,
  onSeek,
  editingIndex = null,
  onEditStart,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onSpeakerToggle,
  title,
  diffStatuses,
  alternativeMine,
  alternativeTheirs,
  onUseSegmentFromAlternative,
  scrollContainerRef,
}: TranscriptColumnProps) {
  const isEditable = mode === 'edit' || mode === 'suggesting'
  const supportsAlternatives =
    mode === 'suggesting' && Boolean(onUseSegmentFromAlternative)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const entryRefs = useRef<Array<HTMLDivElement | null>>([])
  const editInputRef = useRef<HTMLTextAreaElement | null>(null)
  const lastActiveIdx = useRef<number>(-1)

  const activeIdx = useMemo(() => {
    if (segments.length === 0) return -1
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      if (currentTime >= s.start_time_seconds && currentTime < s.end_time_seconds) {
        return i
      }
    }
    return -1
  }, [segments, currentTime])

  useEffect(() => {
    if (activeIdx === -1 || activeIdx === lastActiveIdx.current) return
    lastActiveIdx.current = activeIdx
    if (editingIndex !== null) return
    const el = entryRefs.current[activeIdx]
    if (el && containerRef.current) {
      const c = containerRef.current
      const elTop = el.offsetTop
      const elBottom = elTop + el.offsetHeight
      const cTop = c.scrollTop
      const cBottom = cTop + c.clientHeight
      if (elTop < cTop || elBottom > cBottom) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeIdx, editingIndex])

  useEffect(() => {
    if (editingIndex === null) return
    const el = editInputRef.current
    if (!el) return
    el.focus()
    el.select()
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [editingIndex])

  if (segments.length === 0) {
    return (
      <div className="px-4 py-3">
        {title ? (
          <h3 className="text-sm font-semibold text-ink mb-2 bg-white">{title}</h3>
        ) : null}
        <p className="text-xs text-brown mb-2">
          No diarization available. Showing flat machine transcript.
        </p>
        <p className="text-ink whitespace-pre-wrap leading-relaxed">
          {fallbackTranscript || (
            <span className="text-brown italic">No transcript.</span>
          )}
        </p>
      </div>
    )
  }

  return (
    <div
      ref={(el) => {
        containerRef.current = el
        if (scrollContainerRef) scrollContainerRef.current = el
      }}
      className="px-4 py-3 space-y-1.5 overflow-y-auto"
    >
      {title ? (
        <h3 className="text-sm font-semibold text-ink mb-2 sticky top-0 bg-white z-10 -mx-4 px-4 -mt-3 pt-3 pb-2 border-b border-ink/10 shadow-sm">
          {title}
        </h3>
      ) : null}
      {segments.map((segment, idx) => {
        const styles = stylesFor(segment.speaker_id)
        const isActive = idx === activeIdx
        const isEditing = isEditable && idx === editingIndex
        const toggleable = isToggleable(segment.speaker_id)
        const diffClass = diffStatuses?.[idx]
          ? diffStatusToTailwindClass(diffStatuses[idx])
          : ''

        // Suggesting-mode buttons. "Use mine" appears when the segment
        // differs from the labeler's previous submission. "Use owner's"
        // appears when the segment differs from the owner's suggestion.
        // Both hidden while editing the same row to avoid mis-clicks
        // while the textarea is active.
        const mineCandidate = alternativeMine?.[idx]
        const theirsCandidate = alternativeTheirs?.[idx]
        const showUseMine =
          supportsAlternatives &&
          !isEditing &&
          Boolean(mineCandidate) &&
          !segmentsEqualForDiff(segment, mineCandidate)
        const showUseTheirs =
          supportsAlternatives &&
          !isEditing &&
          Boolean(theirsCandidate) &&
          !segmentsEqualForDiff(segment, theirsCandidate)

        return (
          <div
            key={idx}
            ref={(el) => {
              entryRefs.current[idx] = el
            }}
            data-segment-index={idx}
            className={`flex items-start gap-2 px-1 py-1 rounded transition-colors ${
              isEditing
                ? 'border border-terra bg-cream'
                : isActive
                  ? styles.active
                  : ''
            } ${diffClass}`}
          >
            <div className="flex-none flex flex-col items-start gap-0.5">
              <div
                className={`flex items-center gap-0.5 rounded-full pl-2 pr-1 py-0.5 transition-colors duration-150 ${styles.pill}`}
              >
                <button
                  type="button"
                  onClick={() => onSeek(segment.start_time_seconds)}
                  title="Seek to this segment"
                  aria-label={`Seek to ${speakerLabel(segment.speaker_id)} segment at ${segment.start_time_seconds.toFixed(1)}s`}
                  className="font-bold font-mono text-xs w-7 text-left hover:underline"
                >
                  {speakerLabel(segment.speaker_id)}
                </button>
                {isEditable && onSpeakerToggle ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSpeakerToggle(idx)
                    }}
                    disabled={!toggleable}
                    title={
                      toggleable
                        ? 'Toggle speaker (S1 to S2)'
                        : 'Cannot toggle non-standard speaker'
                    }
                    aria-label="Toggle speaker for this segment"
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] transition-colors duration-150 ${styles.swap} disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    ⇄
                  </button>
                ) : null}
              </div>
              {(showUseMine || showUseTheirs) ? (
                <div className="flex items-center gap-2 pl-1 text-[10px] leading-none">
                  {showUseMine ? (
                    <button
                      type="button"
                      onClick={() => onUseSegmentFromAlternative?.(idx, 'mine')}
                      className="underline text-gray-600 hover:text-gray-900"
                      title="Replace this segment with your previous submission"
                    >
                      Use mine
                    </button>
                  ) : null}
                  {showUseTheirs ? (
                    <button
                      type="button"
                      onClick={() => onUseSegmentFromAlternative?.(idx, 'theirs')}
                      className="underline text-gray-600 hover:text-gray-900"
                      title="Replace this segment with the owner's suggestion"
                    >
                      Use owner&apos;s
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="flex-1 leading-relaxed min-w-0">
              {isEditing && onEditChange && onEditCommit && onEditCancel ? (
                <textarea
                  ref={editInputRef}
                  value={segment.transcript}
                  onChange={(e) => {
                    onEditChange(idx, e.target.value)
                    const el = e.currentTarget
                    el.style.height = 'auto'
                    el.style.height = `${el.scrollHeight}px`
                  }}
                  onBlur={onEditCommit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      onEditCommit()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      onEditCancel(idx)
                    }
                  }}
                  rows={1}
                  spellCheck={false}
                  className="w-full bg-transparent border-0 outline-none focus:outline-none resize-none text-ink leading-relaxed font-sans p-0"
                />
              ) : isEditable && onEditStart ? (
                <button
                  type="button"
                  onClick={() => onEditStart(idx)}
                  title="Click to edit"
                  className={`block w-full text-left text-ink rounded px-1 -mx-1 py-0.5 cursor-text ${
                    isActive ? 'font-semibold' : ''
                  } hover:bg-ink/5`}
                >
                  {segment.transcript || (
                    <span className="text-brown italic">… (click to edit)</span>
                  )}
                </button>
              ) : (
                <div
                  className={`block w-full text-left text-ink px-1 -mx-1 py-0.5 whitespace-pre-wrap ${
                    isActive ? 'font-semibold' : ''
                  }`}
                >
                  {segment.transcript || (
                    <span className="text-brown italic">(empty segment)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
