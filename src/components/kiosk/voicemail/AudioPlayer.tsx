'use client'

// Custom inline audio player for the voicemail-route kiosk (Direction A).
// Not native <audio> chrome. The synthetic 56-bar waveform is decoration;
// the played / unplayed split and the elapsed time are driven by a real
// HTMLAudioElement. Ported from design_handoff_voicemail_kiosk common.jsx
// and wired to real audio per the implementation brief section 8.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDuration } from './helpers'
import { IconPause, IconPlay } from './icons'
import styles from './styles.module.css'

interface AudioPlayerProps {
  audioUrl: string
  durationSeconds: number
}

const BAR_COUNT = 56

// Deterministic waveform: seeded from the duration so the same voicemail
// always renders the same bars. The sin((i/n)*pi) envelope makes the middle
// bars tallest. Ported verbatim from the CD prototype.
function buildBars(durationSeconds: number): number[] {
  let s = Math.floor(durationSeconds * 9973)
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const env = Math.sin((i / BAR_COUNT) * Math.PI)
    return 0.15 + 0.85 * (0.35 + 0.65 * rand()) * (0.5 + 0.5 * env)
  })
}

export function AudioPlayer({ audioUrl, durationSeconds }: AudioPlayerProps) {
  const hasAudio = audioUrl.trim() !== ''
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0) // 0..1
  const [errored, setErrored] = useState(false)
  // Real media duration once metadata loads; falls back to the record value.
  const [mediaDuration, setMediaDuration] = useState(durationSeconds)

  const bars = useMemo(() => buildBars(durationSeconds), [durationSeconds])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => {
      const d = audio.duration || durationSeconds
      if (d > 0) setProgress(Math.min(1, audio.currentTime / d))
    }
    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setMediaDuration(audio.duration)
      }
    }
    const onEnded = () => {
      setPlaying(false)
      setProgress(1) // leave the waveform fully played
    }
    const onError = () => {
      setErrored(true)
      setPlaying(false)
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
    }
  }, [durationSeconds])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    void audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => {
        setErrored(true)
        setPlaying(false)
      })
  }, [playing])

  const seekTo = useCallback(
    (p: number) => {
      const clamped = Math.max(0, Math.min(1, p))
      setProgress(clamped)
      const audio = audioRef.current
      if (audio) audio.currentTime = clamped * (audio.duration || durationSeconds)
    },
    [durationSeconds],
  )

  const onWaveClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      seekTo((e.clientX - rect.left) / rect.width)
    },
    [seekTo],
  )

  const onWaveKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        seekTo(progress - 0.05)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        seekTo(progress + 0.05)
      }
    },
    [progress, seekTo],
  )

  // No audio source, or it failed to load: a small mono tag stands in for
  // the player so the card still renders cleanly.
  if (!hasAudio || errored) {
    return (
      <div className="flex items-center gap-2.5 rounded-md border border-dashed border-rcp-rule px-3 py-2">
        <span className="font-rcp-mono text-[11px] uppercase tracking-[0.04em] text-rcp-brown">
          audio unavailable
        </span>
      </div>
    )
  }

  const elapsed = progress * mediaDuration

  return (
    <div className="flex items-center gap-2.5 rounded-md border border-dashed border-rcp-rule px-3 py-2">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? 'Pause' : 'Play'}
        className={cn(
          styles.tap48,
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          'bg-rcp-play-bg text-rcp-play-fg hover:bg-rcp-play-hover-bg',
        )}
      >
        {playing ? <IconPause w={14} h={14} /> : <IconPlay w={14} h={14} />}
      </button>
      <div
        onClick={onWaveClick}
        onKeyDown={onWaveKeyDown}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        tabIndex={0}
        className="flex h-8 flex-1 cursor-pointer items-center gap-0.5"
      >
        {bars.map((h, i) => {
          const played = i / bars.length <= progress
          return (
            <span
              key={i}
              className={cn(
                'inline-block min-h-[4px] flex-1 rounded-[1px] transition-colors duration-[120ms]',
                played ? 'bg-rcp-bar-played' : 'bg-rcp-bone',
                playing && styles.waveBarLive,
              )}
              style={{
                height: `${Math.round(h * 100)}%`,
                animationDelay: `${(i % 8) * 80}ms`,
              }}
            />
          )
        })}
      </div>
      <span className="whitespace-nowrap font-rcp-mono text-[11px] tracking-[0.03em] tabular-nums text-rcp-brown">
        {formatDuration(elapsed)} / {formatDuration(mediaDuration)}
      </span>
    </div>
  )
}
