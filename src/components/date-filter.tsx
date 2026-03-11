'use client'

import { useState, useRef, useEffect } from 'react'
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
  const pickerRef = useRef<HTMLDivElement>(null)
  const [localFrom, setLocalFrom] = useState(customRange?.from || '')
  const [localTo, setLocalTo] = useState(customRange?.to || '')

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const customLabel = customRange
    ? `${new Date(customRange.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(customRange.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : 'Custom'

  return (
    <div className="flex items-center gap-1.5 relative flex-wrap">
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

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute bg-white z-20"
          style={{
            top: '100%',
            right: 0,
            marginTop: 8,
            padding: 16,
            borderRadius: 14,
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            minWidth: 280,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', marginBottom: 10 }}>Select date range</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label style={{ fontSize: 11, color: '#B0A090', display: 'block', marginBottom: 4 }}>From</label>
              <input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="w-full focus:outline-none"
                style={{
                  padding: '8px 10px', borderRadius: 8,
                  border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 13,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
              />
            </div>
            <div className="flex-1">
              <label style={{ fontSize: 11, color: '#B0A090', display: 'block', marginBottom: 4 }}>To</label>
              <input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="w-full focus:outline-none"
                style={{
                  padding: '8px 10px', borderRadius: 8,
                  border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 13,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
              />
            </div>
          </div>
          <button
            onClick={() => {
              if (localFrom && localTo && onCustomRange) {
                onCustomRange({ from: localFrom, to: localTo })
                setShowPicker(false)
              }
            }}
            disabled={!localFrom || !localTo}
            className="w-full mt-3 bg-terra text-white font-semibold transition-colors hover:bg-terra-dark disabled:opacity-40"
            style={{ padding: '8px 0', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
