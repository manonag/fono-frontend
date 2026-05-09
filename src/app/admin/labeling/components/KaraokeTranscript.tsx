'use client'

import { useEffect, useMemo, useRef } from 'react'
import { speakerLabel } from '../lib/formatters'
import type { VerifiedSegment } from '../lib/types'

interface KaraokeTranscriptProps {
  segments: VerifiedSegment[]
  fallbackTranscript: string | null
  currentTime: number
  editingIndex: number | null
  onSeek: (seconds: number) => void
  onEditStart: (index: number) => void
  onEditChange: (index: number, transcript: string) => void
  onEditCommit: () => void
  onEditCancel: (index: number) => void
  onSpeakerToggle: (index: number) => void
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

export function KaraokeTranscript({
  segments,
  fallbackTranscript,
  currentTime,
  editingIndex,
  onSeek,
  onEditStart,
  onEditChange,
  onEditCommit,
  onEditCancel,
  onSpeakerToggle,
}: KaraokeTranscriptProps) {
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
        <p className="text-xs text-brown mb-2">
          No diarization available — showing flat machine transcript.
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
    <div ref={containerRef} className="px-4 py-3 space-y-1.5 overflow-y-auto">
      {segments.map((segment, idx) => {
        const styles = stylesFor(segment.speaker_id)
        const isActive = idx === activeIdx
        const isEditing = idx === editingIndex
        const toggleable = isToggleable(segment.speaker_id)

        return (
          <div
            key={idx}
            ref={(el) => {
              entryRefs.current[idx] = el
            }}
            className={`flex items-start gap-2 px-1 py-1 rounded transition-colors ${
              isEditing
                ? 'border border-terra bg-cream'
                : isActive
                  ? styles.active
                  : ''
            }`}
          >
            <div
              className={`flex-none flex items-center gap-0.5 rounded-full pl-2 pr-1 py-0.5 transition-colors duration-150 ${styles.pill}`}
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
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSpeakerToggle(idx)
                }}
                disabled={!toggleable}
                title={
                  toggleable
                    ? 'Toggle speaker (S1 ↔ S2)'
                    : 'Cannot toggle non-standard speaker'
                }
                aria-label="Toggle speaker for this segment"
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] transition-colors duration-150 ${styles.swap} disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                ⇄
              </button>
            </div>
            <div className="flex-1 leading-relaxed min-w-0">
              {isEditing ? (
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
              ) : (
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
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
