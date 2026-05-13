'use client'

import { useState } from 'react'
import {
  AUDIO_QUALITY_LABELS,
  CALL_TYPE_LABELS,
  LANGUAGE_PROFILE_LABELS,
} from '../lib/enums'
import { TagPanel, type TagPanelValue } from './TagPanel'

interface CollapsibleTagPanelProps {
  value: TagPanelValue
  onChange: (next: TagPanelValue) => void
  defaultExpanded?: boolean
  /** Forwarded to TagPanel. Used by the labeler page to suppress
   * keyboard shortcuts while the reviewer-notes textarea has focus. */
  onTextFocusChange?: (focused: boolean) => void
}

/**
 * TagPanel wrapped in a collapsible section with a single-line summary
 * chip in the collapsed header. Used on the reviewer page and the
 * labeler suggestions view so the full panel does not eat ~480px of
 * vertical space below the three transcript columns by default.
 *
 * The full TagPanel itself is untouched (still used as-is on the
 * regular labeler workspace where space is not contested).
 */
export function CollapsibleTagPanel({
  value,
  onChange,
  defaultExpanded = false,
  onTextFocusChange,
}: CollapsibleTagPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const summary = summarizeTags(value)

  return (
    <div className="bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-2 text-left px-4 py-2 hover:bg-ink/5 transition-colors"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`flex-none text-brown transition-transform duration-150 ${
            expanded ? 'rotate-90' : ''
          }`}
          aria-hidden="true"
        >
          <path
            d="M4 2 L8 6 L4 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-sm font-semibold text-ink">Tags</span>
        {!expanded ? (
          <span
            className="text-xs text-brown truncate flex-1"
            title={summary}
          >
            {summary}
          </span>
        ) : null}
      </button>
      {expanded ? (
        <div className="max-h-[280px] overflow-y-auto border-t border-ink/10">
          <TagPanel
            value={value}
            onChange={onChange}
            onTextFocusChange={onTextFocusChange}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Compress the 10-field TagPanel state into a glanceable single line for
 * the collapsed header. Order chosen to match the section order inside
 * TagPanel so a reader's eye finds the same field in the same place.
 */
function summarizeTags(t: TagPanelValue): string {
  const parts: string[] = []

  if (t.language_profile_tag) {
    parts.push(LANGUAGE_PROFILE_LABELS[t.language_profile_tag])
  }
  if (t.call_type_tag) {
    parts.push(CALL_TYPE_LABELS[t.call_type_tag])
  }
  if (t.audio_quality_tag) {
    parts.push(AUDIO_QUALITY_LABELS[t.audio_quality_tag])
  }

  if (t.error_tags && t.error_tags.length > 0) {
    const n = t.error_tags.length
    parts.push(`${n} error tag${n === 1 ? '' : 's'}`)
  }

  const containsFlags: string[] = []
  if (t.contains_menu_items) containsFlags.push('Menu items')
  if (t.contains_prices) containsFlags.push('Prices')
  if (t.contains_phone_numbers) containsFlags.push('Phone numbers')
  if (t.contains_names) containsFlags.push('Names')
  if (containsFlags.length > 0) {
    parts.push(containsFlags.join(', '))
  }

  if (t.is_holdout) {
    parts.push('Holdout')
  }

  return parts.length > 0 ? parts.join(' · ') : 'No tags set'
}
