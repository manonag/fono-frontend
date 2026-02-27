'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DateFilter } from '@/types'

interface DateFilterProps {
  value: DateFilter
  onChange: (filter: DateFilter) => void
}

const filters: { id: DateFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
]

export function DateFilterBar({ value, onChange }: DateFilterProps) {
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  return (
    <div className="space-y-2">
      <div className="flex items-center overflow-x-auto pb-1 scrollbar-none" style={{ gap: 8 }}>
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => onChange(f.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex-shrink-0',
              value === f.id
                ? 'bg-terra text-white'
                : 'bg-white text-brown hover:bg-cream'
            )}
            style={{
              fontSize: 13,
              fontWeight: 500,
              border: value === f.id ? 'none' : '1px solid rgba(0,0,0,0.08)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {value === 'custom' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1 focus:border-terra focus:outline-none"
            style={{ borderColor: 'rgba(0,0,0,0.08)' }}
          />
          <span className="text-brown text-sm">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1 focus:border-terra focus:outline-none"
            style={{ borderColor: 'rgba(0,0,0,0.08)' }}
          />
        </div>
      )}
    </div>
  )
}
