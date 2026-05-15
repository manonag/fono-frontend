'use client'

// Client hooks for the voicemail-route kiosk (Direction A - receipt).
// Ported from design_handoff_voicemail_kiosk/kiosk/common.jsx.

import { useEffect, useState } from 'react'

// Reveals `text` one character at a time. Used for the processing-card
// "Transcribing the voicemail" aliveness line. Direction A runs at 22ms/char
// per the CD README "Animations / motion" section.
export function useTypewriter(text: string, speed = 22, enabled = true): string {
  const [out, setOut] = useState(enabled ? '' : text)
  useEffect(() => {
    if (!enabled) {
      setOut(text)
      return
    }
    setOut('')
    let i = 0
    const id = setInterval(() => {
      i++
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, speed, enabled])
  return out
}

// Ticking clock for the header chrome and relative timestamps. Returns 0
// until mounted so the server-rendered HTML and the first client render
// match (no hydration mismatch); consumers should treat 0 as "not ready".
export function useClock(intervalMs = 1000): number {
  const [now, setNow] = useState(0)
  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
