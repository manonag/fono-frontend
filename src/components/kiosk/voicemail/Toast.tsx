'use client'

// Minimal toast for the voicemail-route kiosk (Direction A - receipt).
// No library. Bottom-center, auto-dismisses after 4s. Used to surface a
// failed optimistic mutation after the local state has been rolled back
// (brief section 6). The CD design-system audit flagged that fono-frontend
// has no shared toast primitive; this is the in-scope minimal stand-in.

import { useEffect } from 'react'

interface ToastProps {
  message: string
  onDismiss: () => void
  durationMs?: number
}

export function Toast({ message, onDismiss, durationMs = 4000 }: ToastProps) {
  // `onDismiss` must be referentially stable (KioskPage memoizes it) so the
  // timer is not reset by unrelated parent re-renders (the header clock
  // ticks every second).
  useEffect(() => {
    const id = setTimeout(onDismiss, durationMs)
    return () => clearTimeout(id)
  }, [message, onDismiss, durationMs])

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-in fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-md border border-rcp-card-border bg-rcp-popover-bg px-4 py-3 font-rcp-mono text-[12px] text-rcp-text-strong shadow-rcp-popover"
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-rcp-danger" />
      <span>{message}</span>
    </div>
  )
}
