'use client'

import { useEffect, useState } from 'react'
import { CallEvent } from '@/hooks/useCallEvents'
import { formatPhoneNumber } from '@/lib/utils'

interface LiveBannerProps {
  latestEvent: CallEvent | null
}

export default function LiveBanner({ latestEvent }: LiveBannerProps) {
  const [visible, setVisible] = useState(false)
  const [event, setEvent] = useState<CallEvent | null>(null)

  useEffect(() => {
    if (latestEvent && latestEvent.type === 'call_status') {
      setEvent(latestEvent)
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [latestEvent])

  if (!visible || !event) return null

  const callerNumber = event.data.caller_number || 'Unknown'
  const status = event.data.status || 'ringing'

  return (
    <div className="animate-slide-in-top bg-white border border-warm-border rounded-xl shadow-lg p-4 flex items-center gap-3">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink truncate">
          {status === 'ringing' ? 'Incoming call' : `Call ${status}`} from{' '}
          <span className="text-terra">{formatPhoneNumber(callerNumber)}</span>
        </p>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-brown-light hover:text-ink transition-colors"
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </button>
    </div>
  )
}
