// Visual badges for the /admin/insights dashboard (sprint 1610b462).
// Tailwind-only; intent and tone render as neutral chips, confidence
// carries the brief's color scale (high=red, medium=orange, low=gray,
// none=neutral).

import type { HotLeadConfidence } from '../lib/types'
import { humanize } from '../lib/format'

const chipBase =
  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium'

const CONFIDENCE_STYLES: Record<HotLeadConfidence, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-orange-100 text-orange-700',
  low: 'bg-gray-100 text-gray-600',
  none: 'bg-ink/5 text-brown',
}

export function ConfidenceBadge({
  value,
}: {
  value: HotLeadConfidence | null
}) {
  const key: HotLeadConfidence = value ?? 'none'
  return (
    <span
      className={`${chipBase} font-semibold uppercase ${CONFIDENCE_STYLES[key]}`}
      title="Hot lead confidence"
    >
      {key}
    </span>
  )
}

export function IntentBadge({ value }: { value: string | null }) {
  if (!value) return null
  return (
    <span
      className={`${chipBase} bg-terra/10 text-terra-dark`}
      title="Primary intent"
    >
      {humanize(value)}
    </span>
  )
}

export function ToneBadge({ value }: { value: string | null }) {
  if (!value) return null
  return (
    <span className={`${chipBase} bg-ink/5 text-brown`} title="Emotional tone">
      {humanize(value)}
    </span>
  )
}
