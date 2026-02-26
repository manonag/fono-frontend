'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { config } from '@/lib/config'

export interface CallEvent {
  type: 'call_status' | 'recording_ready'
  data: {
    call_id?: string
    caller_number?: string
    status?: string
    recording_url?: string
    timestamp?: string
    [key: string]: unknown
  }
  receivedAt: Date
}

export function useCallEvents(tenantId: string) {
  const [events, setEvents] = useState<CallEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [latestEvent, setLatestEvent] = useState<CallEvent | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const url = `${config.apiUrl}/api/v1/events/calls?tenant_id=${tenantId}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onopen = () => {
      setConnected(true)
      retryCountRef.current = 0
    }

    es.addEventListener('call_status', (e) => {
      try {
        const data = JSON.parse(e.data)
        const event: CallEvent = { type: 'call_status', data, receivedAt: new Date() }
        setEvents((prev) => [event, ...prev].slice(0, 50))
        setLatestEvent(event)
      } catch { /* ignore parse errors */ }
    })

    es.addEventListener('recording_ready', (e) => {
      try {
        const data = JSON.parse(e.data)
        const event: CallEvent = { type: 'recording_ready', data, receivedAt: new Date() }
        setEvents((prev) => [event, ...prev].slice(0, 50))
        setLatestEvent(event)
      } catch { /* ignore parse errors */ }
    })

    es.onerror = () => {
      setConnected(false)
      es.close()
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000)
      retryCountRef.current++
      retryTimeoutRef.current = setTimeout(connect, delay)
    }
  }, [tenantId])

  useEffect(() => {
    connect()
    return () => {
      eventSourceRef.current?.close()
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [connect])

  return { events, connected, latestEvent }
}
