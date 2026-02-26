'use client'

import { Call } from '@/lib/api'
import { formatPhoneNumber, formatDuration, timeAgo } from '@/lib/utils'
import StatusBadge from './StatusBadge'
import AudioPlayer from './AudioPlayer'
import CallBackButton from './CallBackButton'

interface CallRowProps {
  call: Call
}

export default function CallRow({ call }: CallRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 bg-white rounded-xl border border-warm-border hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full bg-cream-secondary flex items-center justify-center flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-terra">
            <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.482 8.062a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328z" fill="currentColor"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-ink text-sm truncate">{formatPhoneNumber(call.caller_number)}</p>
          <p className="text-xs text-brown-light">{timeAgo(call.created_at)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
        <StatusBadge status={call.status} />
        {call.duration > 0 && (
          <span className="text-xs text-brown-light">{formatDuration(call.duration)}</span>
        )}
        {call.recording_url && <AudioPlayer recordingUrl={call.recording_url} />}
        {call.status === 'missed' && <CallBackButton phoneNumber={call.caller_number} />}
      </div>
    </div>
  )
}
