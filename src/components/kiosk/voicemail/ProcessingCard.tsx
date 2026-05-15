'use client'

// Processing-state card for the voicemail-route kiosk (Direction A).
// Rendered when audio is captured but transcription has not completed.
// "Patient, not loading": no spinner, no progress bar, no processing pill -
// just an italic typewriter line with a blinking caret, the captured
// timestamp, and a working audio player. Distinct render path from the
// regular VoicemailCard. Ported from design_handoff_voicemail_kiosk.

import { AudioPlayer } from './AudioPlayer'
import { formatClock, formatDuration, formatPhone, formatRelative, ticketId } from './helpers'
import { useClock, useTypewriter } from './hooks'
import styles from './styles.module.css'
import type { Voicemail } from './types'

interface ProcessingCardProps {
  voicemail: Voicemail
  index: number
}

export function ProcessingCard({ voicemail, index }: ProcessingCardProps) {
  // `now` is 0 until mounted; locale-formatted timestamps are gated on it so
  // the server and first client render match.
  const now = useClock()
  const typed = useTypewriter('Transcribing the voicemail', 22, true)

  return (
    <article className={styles.card}>
      {/* Ticket header band - pending stamp, not interactive. */}
      <div className="relative flex items-center gap-3 border-b border-dashed border-rcp-rule px-[18px] pb-3 pt-3.5">
        <span aria-disabled="true" className="inline-flex items-baseline gap-1.5 pb-1.5 pt-1">
          <span className="font-rcp-mono text-[13px] font-semibold italic text-rcp-brown">[</span>
          <span className="font-rcp-mono text-[13px] font-bold italic tracking-[0.02em] text-rcp-brown">
            pending
          </span>
          <span className="font-rcp-mono text-[13px] font-semibold italic text-rcp-brown">]</span>
          <span className="ml-2 text-[15px] font-bold italic tracking-[-0.01em] text-rcp-brown">
            Transcribing
          </span>
        </span>
        <span
          aria-hidden="true"
          className="mx-1.5 h-px flex-1 self-center border-t border-dashed border-rcp-rule"
        />
        <span className="inline-flex items-center gap-1.5 font-rcp-mono text-[11px] tabular-nums text-rcp-brown">
          <span className="font-semibold tracking-[0.02em] text-rcp-text-body">
            {ticketId(index)}
          </span>
          <span className="opacity-60">·</span>
          <span className="tracking-[0.02em]">
            {now > 0 ? formatRelative(voicemail.captured_at, now) : ''}
          </span>
        </span>
      </div>

      {/* Body */}
      <div className="px-[18px] pb-3 pt-3.5">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="font-rcp-mono text-[22px] font-bold tracking-[-0.005em] tabular-nums text-rcp-text-strong">
            {formatPhone(voicemail.caller_phone)}
          </span>
          <span className="font-rcp-mono text-[12px] tracking-[0.03em] tabular-nums text-rcp-brown">
            {formatDuration(voicemail.audio_duration_seconds)}
          </span>
        </div>

        <p className="mb-3.5 mt-1.5 text-[15px] italic leading-[1.5] text-rcp-brown">
          <em>{typed}</em>
          <span
            aria-hidden="true"
            className={`ml-0.5 inline-block translate-y-px not-italic text-rcp-terra-warm ${styles.caret}`}
          >
            |
          </span>
        </p>

        <AudioPlayer
          audioUrl={voicemail.audio_url}
          durationSeconds={voicemail.audio_duration_seconds}
        />
      </div>

      {/* Quiet footer */}
      <div
        className={`flex flex-wrap items-center gap-1.5 border-t border-dashed border-rcp-rule px-[18px] py-3 ${styles.cardFoot}`}
      >
        <span className="font-rcp-mono text-[11px] tracking-[0.02em] text-rcp-brown">
          captured {now > 0 ? formatClock(voicemail.captured_at) : ''} &middot; transcript usually
          lands within a minute
        </span>
      </div>
    </article>
  )
}
