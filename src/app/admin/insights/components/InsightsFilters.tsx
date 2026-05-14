// Filter bar for the Recent Conversations section (sprint 1610b462).
// Date range presets per the brief (24h / 7d / 30d / all), multi-select
// toggle chips for intent / tone / confidence, and a show-excluded
// checkbox. Tailwind-only, chips wrap for narrow screens.

'use client'

import type {
  EmotionalTone,
  HotLeadConfidence,
  PrimaryIntent,
} from '../lib/types'
import { humanize } from '../lib/format'

export type DateRangeKey = '24h' | '7d' | '30d' | 'all'

export interface InsightsFiltersState {
  dateRange: DateRangeKey
  primaryIntent: PrimaryIntent[]
  emotionalTone: EmotionalTone[]
  hotLeadConfidence: HotLeadConfidence[]
  showExcluded: boolean
}

export const DEFAULT_FILTERS: InsightsFiltersState = {
  dateRange: '7d',
  primaryIntent: [],
  emotionalTone: [],
  hotLeadConfidence: [],
  showExcluded: false,
}

const DATE_OPTIONS: { key: DateRangeKey; label: string }[] = [
  { key: '24h', label: 'Last 24h' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
]

const INTENT_OPTIONS: PrimaryIntent[] = [
  'information_seeking',
  'comparison_shopping',
  'ready_to_buy',
  'support_question',
  'exploratory',
  'competitor_research',
  'press_partnership_recruiting',
  'unknown',
]

const TONE_OPTIONS: EmotionalTone[] = [
  'positive',
  'neutral',
  'frustrated',
  'confused',
  'excited',
]

const CONFIDENCE_OPTIONS: HotLeadConfidence[] = [
  'high',
  'medium',
  'low',
  'none',
]

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value)
    ? arr.filter((x) => x !== value)
    : [...arr, value]
}

// Convert a date-range preset to an ISO lower bound. 'all' clears the
// bound (returns undefined so no date_from is sent).
export function dateRangeToIso(key: DateRangeKey): string | undefined {
  if (key === 'all') return undefined
  const dayMs = 86_400_000
  const span = key === '24h' ? dayMs : key === '7d' ? 7 * dayMs : 30 * dayMs
  return new Date(Date.now() - span).toISOString()
}

function chipClass(active: boolean): string {
  return [
    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
    active
      ? 'bg-terra text-white border-terra'
      : 'bg-white text-brown border-ink/10 hover:border-terra/40',
  ].join(' ')
}

interface Props {
  value: InsightsFiltersState
  onChange: (next: InsightsFiltersState) => void
}

export function InsightsFilters({ value, onChange }: Props) {
  return (
    <div className="space-y-3 mb-4">
      <div className="flex flex-wrap gap-1.5">
        {DATE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange({ ...value, dateRange: opt.key })}
            className={chipClass(value.dateRange === opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase text-brown mb-1">
          Intent
        </p>
        <div className="flex flex-wrap gap-1.5">
          {INTENT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  primaryIntent: toggle(value.primaryIntent, opt),
                })
              }
              className={chipClass(value.primaryIntent.includes(opt))}
            >
              {humanize(opt)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase text-brown mb-1">
          Tone
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  emotionalTone: toggle(value.emotionalTone, opt),
                })
              }
              className={chipClass(value.emotionalTone.includes(opt))}
            >
              {humanize(opt)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase text-brown mb-1">
          Hot lead confidence
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CONFIDENCE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  hotLeadConfidence: toggle(value.hotLeadConfidence, opt),
                })
              }
              className={chipClass(value.hotLeadConfidence.includes(opt))}
            >
              {humanize(opt)}
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-brown cursor-pointer">
        <input
          type="checkbox"
          checked={value.showExcluded}
          onChange={(e) =>
            onChange({ ...value, showExcluded: e.target.checked })
          }
          className="accent-terra"
        />
        Show excluded conversations (competitor research, press, etc.)
      </label>
    </div>
  )
}
