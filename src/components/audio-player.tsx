'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

interface AudioPlayerProps {
  url: string
  compact?: boolean
}

export function AudioPlayer({ url, compact = false }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }, [playing])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
      }
    }
    const onLoaded = () => setDuration(audio.duration)
    const onEnded = () => {
      setPlaying(false)
      setProgress(0)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const size = compact ? 28 : 32

  return (
    <div className="flex items-center gap-2" style={{ maxWidth: compact ? undefined : 160 }}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        onClick={togglePlay}
        className="flex items-center justify-center rounded-full bg-terra text-white hover:bg-terra-dark transition-colors flex-shrink-0"
        style={{ width: size, height: size, minWidth: size }}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1" y="1" width="3" height="8" rx="0.5" />
            <rect x="6" y="1" width="3" height="8" rx="0.5" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M2 1.5v7l6.5-3.5L2 1.5z" />
          </svg>
        )}
      </button>
      <div className="flex-1" style={{ minWidth: compact ? 60 : 80 }}>
        <div className="bg-gray-200 rounded-full overflow-hidden" style={{ height: 3 }}>
          <div
            className="h-full bg-terra rounded-full transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      {duration > 0 && (
        <span className="text-brown tabular-nums flex-shrink-0" style={{ fontSize: 11 }}>{formatTime(duration)}</span>
      )}
    </div>
  )
}
