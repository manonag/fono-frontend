'use client'

import { useEffect } from 'react'
import { postHeartbeat } from '@/app/admin/labeling/lib/api'

const HEARTBEAT_INTERVAL_MS = 30_000

export function useHeartbeat(token: string | undefined, enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !token) return
    let cancelled = false
    const ping = () => {
      if (cancelled) return
      void postHeartbeat(token).catch(() => {
        // best-effort: a missed heartbeat just means the labeler shows
        // briefly offline; the next tick recovers.
      })
    }
    ping()
    const id = window.setInterval(ping, HEARTBEAT_INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [token, enabled])
}
