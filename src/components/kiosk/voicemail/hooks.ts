'use client'

// Client hooks for the voicemail-route kiosk (Direction A - receipt).
// Ported from design_handoff_voicemail_kiosk/kiosk/common.jsx.

import { useCallback, useEffect, useState } from 'react'
import type { Density } from './types'

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

// T-228: card density toggle, persisted to localStorage.
//
// Starts at the SSR-safe default ('two') so the server-rendered HTML and the
// first client render match; the stored value is read in an effect on mount,
// which may cause a one-frame correction if the user previously chose a
// different density. localStorage access is wrapped in try/catch so a
// private-mode / disabled-storage browser degrades to the default rather
// than throwing.
const DENSITY_STORAGE_KEY = 'fono.kiosk.density'
const DENSITY_VALUES: readonly Density[] = ['one', 'two', 'list']
const DENSITY_DEFAULT: Density = 'two'

function isDensity(value: unknown): value is Density {
  return (
    typeof value === 'string' &&
    (DENSITY_VALUES as readonly string[]).includes(value)
  )
}

export function useKioskDensity(): [Density, (next: Density) => void] {
  const [density, setDensityState] = useState<Density>(DENSITY_DEFAULT)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DENSITY_STORAGE_KEY)
      if (isDensity(stored)) setDensityState(stored)
    } catch {
      // localStorage unavailable - keep the default.
    }
  }, [])

  const setDensity = useCallback((next: Density) => {
    setDensityState(next)
    try {
      window.localStorage.setItem(DENSITY_STORAGE_KEY, next)
    } catch {
      // Persist failure is non-fatal - the in-memory selection still applies.
    }
  }, [])

  return [density, setDensity]
}
