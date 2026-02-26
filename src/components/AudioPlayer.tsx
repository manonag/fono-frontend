'use client'

import { useState, useRef } from 'react'
import { config } from '@/lib/config'

interface AudioPlayerProps {
  recordingUrl: string
}

export default function AudioPlayer({ recordingUrl }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef<HTMLAudioElement>(null)

  const fullUrl = recordingUrl.startsWith('http') ? recordingUrl : `${config.recordingBaseUrl}${recordingUrl}`

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }

  const handleTimeUpdate = () => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    setProgress((audio.currentTime / audio.duration) * 100)
  }

  const handleEnded = () => {
    setPlaying(false)
    setProgress(0)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-terra text-white flex items-center justify-center hover:bg-terra-dark transition-colors flex-shrink-0"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="1" width="3" height="10" rx="0.5" />
            <rect x="7" y="1" width="3" height="10" rx="0.5" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 1.5v9l7.5-4.5L3 1.5z" />
          </svg>
        )}
      </button>
      <div className="w-16 sm:w-24 h-1.5 bg-cream-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-terra rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <audio
        ref={audioRef}
        src={fullUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        preload="none"
      />
    </div>
  )
}
