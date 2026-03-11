'use client'

import { useState } from 'react'
import type { DateFilter } from '@/types'

interface DateRange {
  from: string
  to: string
}

interface DateFilterBarProps {
  value: DateFilter
  onChange: (filter: DateFilter) => void
  customRange?: DateRange
  onCustomRange?: (range: DateRange) => void
}

const PILLS: { id: DateFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
]

export function getDateRangeForFilter(filter: DateFilter, customRange?: DateRange): { dateFrom: string; dateTo: string; days: number } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (filter) {
    case 'today':
      return { dateFrom: today.toISOString(), dateTo: now.toISOString(), days: 1 }
    case 'yesterday': {
      const yStart = new Date(today.getTime() - 86400000)
      const yEnd = new Date(today.getTime() - 1)
      return { dateFrom: yStart.toISOString(), dateTo: yEnd.toISOString(), days: 1 }
    }
    case 'week': {
      const day = today.getDay()
      const mondayOffset = day === 0 ? 6 : day - 1
      const monday = new Date(today.getTime() - mondayOffset * 86400000)
      return { dateFrom: monday.toISOString(), dateTo: now.toISOString(), days: 7 }
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return { dateFrom: monthStart.toISOString(), dateTo: now.toISOString(), days: 30 }
    }
    case 'custom': {
      if (customRange) {
        const from = new Date(customRange.from)
        const to = new Date(customRange.to)
        to.setHours(23, 59, 59, 999)
        const diffDays = Math.ceil((to.getTime() - from.getTime()) / 86400000) || 1
        return { dateFrom: from.toISOString(), dateTo: to.toISOString(), days: diffDays }
      }
      return { dateFrom: today.toISOString(), dateTo: now.toISOString(), days: 1 }
    }
    default:
      return { dateFrom: today.toISOString(), dateTo: now.toISOString(), days: 1 }
  }
}

export function DateFilterBar({ value, onChange, customRange, onCustomRange }: DateFilterBarProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [localFrom, setLocalFrom] = useState(customRange?.from || '')
  const [localTo, setLocalTo] = useState(customRange?.to || '')

  const customLabel = customRange
    ? `${new Date(customRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(customRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'Custom'

  return (
    <div>
      {/* Pills row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {PILLS.map((pill) => (
          <button
            key={pill.id}
            onClick={() => {
              if (pill.id === 'custom') {
                setShowPicker(prev => !prev)
                onChange('custom')
              } else {
                setShowPicker(false)
                onChange(pill.id)
              }
            }}
            className="transition-all flex-shrink-0"
            style={{
              padding: '8px 18px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: value === pill.id ? '#E0602A' : '#fff',
              color: value === pill.id ? '#fff' : '#5C3D22',
              border: value === pill.id ? 'none' : '1px solid rgba(0,0,0,0.06)',
              boxShadow: value === pill.id ? '0 2px 8px rgba(224,96,42,0.25)' : 'none',
              cursor: 'pointer',
            }}
          >
            {pill.id === 'custom' && value === 'custom' && customRange ? customLabel : pill.label}
          </button>
        ))}
      </div>

      {/* Inline slide-down date picker */}
      <div
        style={{
          maxHeight: showPicker ? 52 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.2s ease',
        }}
      >
        <div
          className="flex items-center gap-3 flex-wrap"
          style={{
            paddingTop: 10,
            paddingBottom: 4,
            borderBottom: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          <div className="flex items-center gap-2">
            <label style={{ fontSize: 12, color: '#8B7355', fontWeight: 500 }}>From</label>
            <input
              type="date"
              value={localFrom}
              onChange={(e) => setLocalFrom(e.target.value)}
              className="focus:outline-none"
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                fontSize: 13,
                height: 32,
                color: '#5C3D22',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
            />
          </div>
          <span style={{ fontSize: 13, color: '#B0A090' }}>—</span>
          <div className="flex items-center gap-2">
            <label style={{ fontSize: 12, color: '#8B7355', fontWeight: 500 }}>To</label>
            <input
              type="date"
              value={localTo}
              onChange={(e) => setLocalTo(e.target.value)}
              className="focus:outline-none"
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                fontSize: 13,
                height: 32,
                color: '#5C3D22',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
            />
          </div>
          <button
            onClick={() => {
              if (localFrom && localTo && onCustomRange) {
                onCustomRange({ from: localFrom, to: localTo })
                setShowPicker(false)
              }
            }}
            disabled={!localFrom || !localTo}
            className="bg-terra text-white transition-colors hover:bg-terra-dark disabled:opacity-40"
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              height: 32,
              cursor: 'pointer',
              border: 'none',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
