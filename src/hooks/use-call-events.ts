'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { config } from '@/lib/config'
import type { CallEvent } from '@/types'

interface UseCallEventsOptions {
  onEvent?: (event: CallEvent) => void
}

export function useCallEvents({ onEvent }: UseCallEventsOptions = {}) {
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<CallEvent | null>(null)
  const retryCount = useRef(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const onEventRef = useRef(onEvent)

  // Keep callback ref current without causing reconnects
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return

    const es = new EventSource(`${config.apiUrl}/api/v1/events/calls`)
    eventSourceRef.current = es

    es.onopen = () => {
      setConnected(true)
      retryCount.current = 0
    }

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as CallEvent
        setLastEvent(data)
        onEventRef.current?.(data)
      } catch {
        // Ignore heartbeats/non-JSON messages
      }
    }

    es.onerror = () => {
      es.close()
      setConnected(false)
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000)
      retryCount.current++
      setTimeout(connect, delay)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
    }
  }, [connect])

  return { connected, lastEvent }
}
