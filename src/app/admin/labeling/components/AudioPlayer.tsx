'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { formatMmSs } from '../lib/formatters'

export interface AudioPlayerHandle {
  play(): Promise<void>
  pause(): void
  toggle(): void
  seekTo(seconds: number): void
  seekBy(delta: number): void
  setRate(rate: number): void
  getCurrentTime(): number
  getDuration(): number
}

interface AudioPlayerProps {
  src: string
  onTimeUpdate?: (currentTime: number) => void
}

const RATES = [0.75, 1, 1.25, 1.5]

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  function AudioPlayer({ src, onTimeUpdate }, ref) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [rate, setRateState] = useState(1)

    useImperativeHandle(ref, () => ({
      async play() {
        await audioRef.current?.play()
      },
      pause() {
        audioRef.current?.pause()
      },
      toggle() {
        const a = audioRef.current
        if (!a) return
        if (a.paused) void a.play()
        else a.pause()
      },
      seekTo(seconds: number) {
        const a = audioRef.current
        if (!a) return
        a.currentTime = Math.max(0, Math.min(seconds, a.duration || seconds))
      },
      seekBy(delta: number) {
        const a = audioRef.current
        if (!a) return
        a.currentTime = Math.max(0, Math.min(a.currentTime + delta, a.duration || 0))
      },
      setRate(r: number) {
        const a = audioRef.current
        if (!a) return
        a.playbackRate = r
        setRateState(r)
      },
      getCurrentTime() {
        return audioRef.current?.currentTime ?? 0
      },
      getDuration() {
        return audioRef.current?.duration ?? 0
      },
    }))

    useEffect(() => {
      const a = audioRef.current
      if (!a) return
      a.playbackRate = rate
    }, [src, rate])

    useEffect(() => {
      const a = audioRef.current
      if (!a) return
      let raf = 0
      let last = 0
      const tick = () => {
        const t = a.currentTime
        const now = performance.now()
        if (now - last >= 200) {
          setCurrentTime(t)
          onTimeUpdate?.(t)
          last = now
        }
        raf = requestAnimationFrame(tick)
      }
      const onPlay = () => {
        setIsPlaying(true)
        raf = requestAnimationFrame(tick)
      }
      const onPause = () => {
        setIsPlaying(false)
        if (raf) cancelAnimationFrame(raf)
      }
      const onLoaded = () => setDuration(a.duration || 0)
      const onEnded = () => {
        setIsPlaying(false)
        if (raf) cancelAnimationFrame(raf)
      }
      const onSeeked = () => {
        setCurrentTime(a.currentTime)
        onTimeUpdate?.(a.currentTime)
      }
      a.addEventListener('play', onPlay)
      a.addEventListener('pause', onPause)
      a.addEventListener('loadedmetadata', onLoaded)
      a.addEventListener('ended', onEnded)
      a.addEventListener('seeked', onSeeked)
      return () => {
        a.removeEventListener('play', onPlay)
        a.removeEventListener('pause', onPause)
        a.removeEventListener('loadedmetadata', onLoaded)
        a.removeEventListener('ended', onEnded)
        a.removeEventListener('seeked', onSeeked)
        if (raf) cancelAnimationFrame(raf)
      }
    }, [onTimeUpdate])

    const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const a = audioRef.current
      if (!a) return
      const v = parseFloat(e.target.value)
      a.currentTime = v
      setCurrentTime(v)
    }

    const togglePlay = () => {
      const a = audioRef.current
      if (!a) return
      if (a.paused) void a.play()
      else a.pause()
    }

    const max = duration || 0

    return (
      <div className="bg-white border-b border-ink/10">
        <audio ref={audioRef} src={src} preload="metadata" />
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="flex-none w-10 h-10 rounded-full bg-terra hover:bg-terra-dark text-white flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <span className="font-mono text-xs text-ink tabular-nums w-20">
            {formatMmSs(currentTime)} / {formatMmSs(duration)}
          </span>
          <input
            type="range"
            min={0}
            max={max}
            step={0.01}
            value={Math.min(currentTime, max || currentTime)}
            onChange={onSeek}
            className="flex-1 accent-terra"
            aria-label="Seek"
          />
          <div className="flex-none flex items-center gap-1">
            {RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  const a = audioRef.current
                  if (!a) return
                  a.playbackRate = r
                  setRateState(r)
                }}
                className={
                  rate === r
                    ? 'px-2 py-1 rounded text-xs font-semibold bg-ink text-cream'
                    : 'px-2 py-1 rounded text-xs font-medium bg-ink/5 text-ink hover:bg-ink/10'
                }
              >
                {r}x
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  },
)
