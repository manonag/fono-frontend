'use client'

import { useEffect, useRef, useState } from 'react'

import type { DateFilter } from '@/types'

/**
 * Mobile-only filter drawer for the tenant dashboard home.
 *
 * Interaction model (sprint follow-up to PR #5):
 *   - Preset pills (Today / Yesterday / Week / Month) commit and close on
 *     tap. Brief highlight (~100ms) gives a visual ack before dismiss.
 *   - Custom keeps the staged-then-Apply pattern because mobile date
 *     pickers are fiddly and partial taps mid-selection should not yet
 *     trigger a refetch.
 *   - "Clear" link in the header restores Today on tap, closes
 *     immediately. Surfaces only when the committed state is non-default.
 *   - Sticky footer (with the Apply button) renders only while Custom is
 *     the active draft; presets need no footer at all.
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
  /** Called with the resolved selection — by preset tap or Custom Apply. */
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

// Visual-ack delay before a preset tap dismisses the drawer. Short enough
// that it never feels like a hang, long enough that the highlight
// register on slow displays.
const PRESET_COMMIT_DELAY_MS = 100

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
  // Suppress further preset taps during the brief visual-ack window so a
  // double-tap can't fire two commits in the same gesture.
  const [committing, setCommitting] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const commitTimerRef = useRef<number | null>(null)

  // Re-seed every time the drawer opens so a Cancel + reopen shows the
  // committed state, not the prior abandoned draft.
  useEffect(() => {
    if (!open) return
    setDraftFilter(value)
    setDraftFrom(customRange?.from ?? '')
    setDraftTo(customRange?.to ?? '')
    setCommitting(false)
  }, [open, value, customRange])

  // Clear any in-flight commit timer when the drawer unmounts/closes so a
  // late callback can't fire after the parent already moved on.
  useEffect(() => {
    return () => {
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current)
      }
    }
  }, [])

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

  // Custom-range validity: both ends present AND From <= To. The string
  // comparison is safe because <input type="date"> values are ISO
  // YYYY-MM-DD which sorts lexicographically.
  const customDatesValid =
    !!draftFrom && !!draftTo && draftFrom <= draftTo
  const applyDisabled = !customDatesValid
  const showFooter = draftFilter === 'custom'
  const showClear = isFilterActive(value, customRange)

  function handlePresetTap(filter: DateFilter) {
    if (committing) return
    if (filter === 'custom') {
      // Custom is a mode switch — reveal the From/To inputs and wait for
      // Apply. No commit yet, drawer stays open.
      setDraftFilter('custom')
      return
    }
    // Visual ack: paint the selection, then commit + dismiss after a
    // tiny delay so the user sees their tap register. Capture `filter`
    // by closure rather than reading draftFilter inside the timeout
    // (state update from setDraftFilter may not flush by then).
    setDraftFilter(filter)
    setCommitting(true)
    commitTimerRef.current = window.setTimeout(() => {
      onApply(filter, undefined)
      onClose()
      commitTimerRef.current = null
    }, PRESET_COMMIT_DELAY_MS)
  }

  function handleApplyCustom() {
    if (!customDatesValid) return
    onApply('custom', { from: draftFrom, to: draftTo })
    onClose()
  }

  function handleClear() {
    // One-shot reset: commit defaults and dismiss. Skip the visual-ack
    // delay because the drawer is dismissing entirely, not switching
    // between staged options.
    onApply('today', undefined)
    onClose()
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

        {/* Header: title (left), Clear (middle-right, conditional), Close (right) */}
        <div
          className="flex items-center justify-between gap-2"
          style={{ padding: '12px 20px 16px' }}
        >
          <h2 id="filter-drawer-title" style={{ fontSize: 17, fontWeight: 700, color: '#1E0E00' }}>
            Filter calls
          </h2>
          <div className="flex items-center gap-2">
            {showClear && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear filter, reset to Today"
                className="transition-colors hover:text-ink"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#E0602A',
                  background: 'none',
                  border: 'none',
                  padding: '6px 4px',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            )}
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
        </div>

        {/* Body */}
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
            <div
              role="radiogroup"
              aria-labelledby="filter-drawer-title"
              className="flex flex-col gap-2"
            >
              {PILLS.map((pill) => {
                const selected = draftFilter === pill.id
                return (
                  <button
                    key={pill.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => handlePresetTap(pill.id)}
                    disabled={committing}
                    className="transition-all text-left disabled:cursor-default"
                    style={{
                      padding: '14px 18px',
                      borderRadius: 12,
                      fontSize: 15,
                      fontWeight: 500,
                      backgroundColor: selected ? '#E0602A' : '#fff',
                      color: selected ? '#fff' : '#1E0E00',
                      border: selected ? 'none' : '1px solid rgba(0,0,0,0.08)',
                      boxShadow: selected ? '0 2px 8px rgba(224,96,42,0.25)' : 'none',
                      cursor: committing ? 'default' : 'pointer',
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
                    max={draftTo || undefined}
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
                    min={draftFrom || undefined}
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
                {/* From/To order hint surfaces only when both are set and
                    out of order. The Apply button is gated by the same
                    rule, so this just explains why. */}
                {draftFrom && draftTo && draftFrom > draftTo && (
                  <p style={{ fontSize: 12, color: '#EF4444', fontWeight: 500 }}>
                    From must be on or before To.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer — only when Custom needs an explicit Apply step. Preset
            taps commit and close directly, so they don't render this. */}
        {showFooter && (
          <div
            className="flex items-center"
            style={{
              padding: '12px 20px',
              paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              backgroundColor: '#fff',
            }}
          >
            <button
              type="button"
              onClick={handleApplyCustom}
              disabled={applyDisabled}
              aria-disabled={applyDisabled}
              className="transition-colors hover:bg-terra-dark disabled:opacity-50"
              style={{
                flex: 1,
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
        )}
      </div>
    </div>
  )
}
