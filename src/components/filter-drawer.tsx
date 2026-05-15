'use client'

import { useEffect, useRef, useState } from 'react'

import type { DateFilter } from '@/types'

/**
 * Mobile-only filter drawer for the tenant dashboard home.
 *
 * The desktop surface uses `<DateFilterBar>` inline; mobile gets cards
 * across the entire viewport and didn't render filters at all (sprint
 * follow-up to Task 4). This drawer slides up from the bottom, hosts the
 * same date filter the desktop surface drives, and writes back to the
 * page's state only when the user taps Apply — so partial taps don't
 * trigger network fetches.
 *
 * State contract (kept identical to DashboardPage):
 *   { dateFilter: DateFilter, customRange?: { from, to } }
 * Defaults: `dateFilter='today'`, `customRange=undefined`.
 *
 * Not a generic Drawer/Sheet primitive: tied to this one filter shape on
 * purpose. If a second mobile drawer ships, factor out a shared shell.
 */

export interface FilterDrawerCustomRange {
  from: string
  to: string
}

interface FilterDrawerProps {
  open: boolean
  /** Current committed state. Drawer seeds its draft from this on open. */
  value: DateFilter
  customRange?: FilterDrawerCustomRange
  /** Called when the user taps Apply with the draft values. */
  onApply: (next: DateFilter, range?: FilterDrawerCustomRange) => void
  onClose: () => void
}

const PILLS: { id: DateFilter; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
]

/**
 * Predicate used by both the page and the trigger pill: a filter is
 * "active" (non-default) when it's anything other than Today, or when
 * the user has set a custom date range.
 */
export function isFilterActive(
  filter: DateFilter,
  range?: FilterDrawerCustomRange,
): boolean {
  if (filter === 'today' && !range) return false
  if (filter === 'custom' && !range) return false
  return filter !== 'today' || !!range
}

export function FilterDrawer({
  open,
  value,
  customRange,
  onApply,
  onClose,
}: FilterDrawerProps) {
  const [draftFilter, setDraftFilter] = useState<DateFilter>(value)
  const [draftFrom, setDraftFrom] = useState(customRange?.from ?? '')
  const [draftTo, setDraftTo] = useState(customRange?.to ?? '')
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Re-seed every time the drawer opens so a Cancel + reopen shows the
  // committed state, not the prior abandoned draft.
  useEffect(() => {
    if (!open) return
    setDraftFilter(value)
    setDraftFrom(customRange?.from ?? '')
    setDraftTo(customRange?.to ?? '')
  }, [open, value, customRange])

  // Esc closes; basic Tab focus cycling stays inside the panel.
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Move initial focus to the close button so screen readers and keyboard
  // users land somewhere predictable.
  useEffect(() => {
    if (open) closeBtnRef.current?.focus()
  }, [open])

  // Lock page scroll while the drawer is up so the body doesn't scroll
  // under the backdrop on iOS / overscroll-capable browsers.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const customRangeReady = draftFilter === 'custom' && draftFrom && draftTo
  const applyDisabled = draftFilter === 'custom' && !customRangeReady

  function handleApply() {
    if (draftFilter === 'custom') {
      if (!draftFrom || !draftTo) return
      onApply('custom', { from: draftFrom, to: draftTo })
    } else {
      // Non-custom filters clear any prior custom range so the drawer
      // is the single source of truth for what runs after Apply.
      onApply(draftFilter, undefined)
    }
    onClose()
  }

  function handleReset() {
    setDraftFilter('today')
    setDraftFrom('')
    setDraftTo('')
  }

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end md:hidden"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-drawer-title"
        className="bg-white w-full animate-slide-up flex flex-col"
        style={{
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '85vh',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
        }}
      >
        {/* Drag-handle visual cue (non-interactive in v1) */}
        <div className="flex justify-center" style={{ padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.12)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '12px 20px 16px' }}
        >
          <h2 id="filter-drawer-title" style={{ fontSize: 17, fontWeight: 700, color: '#1E0E00' }}>
            Filter calls
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close filter drawer"
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: 'rgba(0,0,0,0.04)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5C3D22" strokeWidth="2">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable when content overflows */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '0 20px 8px' }}>
          <div style={{ marginBottom: 8 }}>
            <p
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#8B7355',
                fontWeight: 600,
                marginBottom: 10,
              }}
            >
              Date range
            </p>
            <div className="flex flex-col gap-2">
              {PILLS.map((pill) => {
                const selected = draftFilter === pill.id
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setDraftFilter(pill.id)}
                    className="transition-all text-left"
                    style={{
                      padding: '14px 18px',
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: 500,
                      backgroundColor: selected ? '#E0602A' : '#fff',
                      color: selected ? '#fff' : '#1E0E00',
                      border: selected ? 'none' : '1px solid rgba(0,0,0,0.08)',
                      boxShadow: selected ? '0 2px 8px rgba(224,96,42,0.25)' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {pill.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom date inputs — only when Custom is the active draft */}
          {draftFilter === 'custom' && (
            <div style={{ marginTop: 16, marginBottom: 12 }}>
              <p
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#8B7355',
                  fontWeight: 600,
                  marginBottom: 10,
                }}
              >
                Custom range
              </p>
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                  <span style={{ fontSize: 12, color: '#8B7355', fontWeight: 500 }}>From</span>
                  <input
                    type="date"
                    value={draftFrom}
                    onChange={(e) => setDraftFrom(e.target.value)}
                    className="focus:outline-none"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.08)',
                      fontSize: 15,
                      color: '#1E0E00',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span style={{ fontSize: 12, color: '#8B7355', fontWeight: 500 }}>To</span>
                  <input
                    type="date"
                    value={draftTo}
                    onChange={(e) => setDraftTo(e.target.value)}
                    className="focus:outline-none"
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.08)',
                      fontSize: 15,
                      color: '#1E0E00',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Sticky footer */}
        <div
          className="flex items-center gap-3"
          style={{
            padding: '12px 20px',
            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
            borderTop: '1px solid rgba(0,0,0,0.06)',
            backgroundColor: '#fff',
          }}
        >
          <button
            type="button"
            onClick={handleReset}
            style={{
              flex: 1,
              padding: '14px 0',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              color: '#8B7355',
              backgroundColor: 'rgba(0,0,0,0.04)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={applyDisabled}
            className="transition-colors hover:bg-terra-dark disabled:opacity-50"
            style={{
              flex: 2,
              padding: '14px 0',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              backgroundColor: '#E0602A',
              border: 'none',
              cursor: applyDisabled ? 'not-allowed' : 'pointer',
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
