'use client'

import { Call } from '@/lib/api'
import { formatPhoneNumber, formatDuration, timeAgo } from '@/lib/utils'
import CallBackButton from '@/components/CallBackButton'

interface LiveCallCardProps {
  call: Call
  index: number
}

export default function LiveCallCard({ call, index }: LiveCallCardProps) {
  const borderColor =
    call.status === 'ringing' || call.status === 'in-progress'
      ? 'border-green-500'
      : call.status === 'missed'
      ? 'border-terra'
      : 'border-white/10'

  const pulseClass = call.status === 'ringing' || call.status === 'in-progress' ? 'animate-pulse' : ''

  return (
    <div
      className={`bg-ink-secondary rounded-2xl border-2 ${borderColor} ${pulseClass} p-6 flex flex-col justify-between animate-fade-in`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div>
        <div className="flex items-start justify-between mb-4">
          <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {formatPhoneNumber(call.caller_number)}
          </p>
          {call.status === 'missed' && (
            <span className="bg-terra text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
              Missed
            </span>
          )}
          {(call.status === 'ringing' || call.status === 'in-progress') && (
            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              {call.status === 'ringing' ? 'Ringing' : 'Active'}
            </span>
          )}
          {call.status === 'answered' && (
            <span className="bg-white/10 text-white/60 text-xs font-bold px-3 py-1 rounded-full uppercase">
              Completed
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-white/50 text-sm">
          {call.duration > 0 && <span>Duration: {formatDuration(call.duration)}</span>}
          <span>{timeAgo(call.created_at)}</span>
        </div>
      </div>

      <div className="mt-6">
        <CallBackButton phoneNumber={call.caller_number} variant="large" />
      </div>
    </div>
  )
}
