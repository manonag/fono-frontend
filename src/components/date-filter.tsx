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
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={cn(
            'px-3 py-1.5 text-sm rounded-full font-medium transition-colors',
            value === f.id
              ? 'bg-terra text-white'
              : 'bg-white text-brown hover:bg-cream border border-gray-200'
          )}
        >
          {f.label}
        </button>
      ))}
      {value === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:border-terra focus:outline-none"
          />
          <span className="text-brown text-sm">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:border-terra focus:outline-none"
          />
        </div>
      )}
    </div>
  )
}
