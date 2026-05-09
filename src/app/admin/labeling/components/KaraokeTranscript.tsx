'use client'

import { useEffect, useMemo, useRef } from 'react'
import { speakerLabel } from '../lib/formatters'
import type { DiarizationEntry } from '../lib/types'

interface KaraokeTranscriptProps {
  entries: DiarizationEntry[]
  fallbackTranscript: string | null
  currentTime: number
  onSeek: (seconds: number) => void
}

interface SpeakerStyles {
  label: string
  active: string
  inactive: string
}

const STYLES_S1: SpeakerStyles = {
  label: 'text-terra',
  active: 'bg-[#FDE3D4] text-ink font-semibold',
  inactive: 'text-ink',
}
const STYLES_S2: SpeakerStyles = {
  label: 'text-teal-700',
  active: 'bg-teal-100 text-ink font-semibold',
  inactive: 'text-ink',
}
const STYLES_DEFAULT: SpeakerStyles = {
  label: 'text-brown',
  active: 'bg-ink/10 text-ink font-semibold',
  inactive: 'text-ink',
}

function stylesFor(speakerId: string): SpeakerStyles {
  const m = /(\d+)/.exec(speakerId)
  if (!m) return STYLES_DEFAULT
  const n = parseInt(m[1], 10)
  if (n === 0) return STYLES_S1
  if (n === 1) return STYLES_S2
  return STYLES_DEFAULT
}

export function KaraokeTranscript({
  entries,
  fallbackTranscript,
  currentTime,
  onSeek,
}: KaraokeTranscriptProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const entryRefs = useRef<Array<HTMLButtonElement | null>>([])
  const lastActiveIdx = useRef<number>(-1)

  const activeIdx = useMemo(() => {
    if (entries.length === 0) return -1
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]
      if (currentTime >= e.start_time_seconds && currentTime < e.end_time_seconds) {
        return i
      }
    }
    return -1
  }, [entries, currentTime])

  useEffect(() => {
    if (activeIdx === -1 || activeIdx === lastActiveIdx.current) return
    lastActiveIdx.current = activeIdx
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
  }, [activeIdx])

  if (entries.length === 0) {
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
      {entries.map((entry, idx) => {
        const styles = stylesFor(entry.speaker_id)
        const isActive = idx === activeIdx
        return (
          <button
            key={idx}
            type="button"
            ref={(el) => {
              entryRefs.current[idx] = el
            }}
            onClick={() => onSeek(entry.start_time_seconds)}
            className={`w-full text-left flex gap-2 px-2 py-1.5 rounded transition-colors ${
              isActive ? styles.active : `${styles.inactive} hover:bg-ink/5`
            }`}
          >
            <span
              className={`flex-none font-bold font-mono w-8 text-xs pt-0.5 ${styles.label}`}
            >
              {speakerLabel(entry.speaker_id)}
            </span>
            <span className="flex-1 leading-relaxed">
              {entry.transcript || <span className="text-brown italic">…</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
