'use client'

// Tab bar for the voicemail-route kiosk (Direction A - receipt).
// Pure presentational: New / Resolved / Hidden with zero-padded mono counts.
// The active tab is underlined Terra with a filled Terra count chip.
// Ported from design_handoff_voicemail_kiosk (RcpTabs).

import { cn } from '@/lib/utils'
import { STATUSES, TAB_LABELS } from './helpers'
import type { Status, TabCounts } from './types'

interface VoicemailTabsProps {
  tab: Status
  setTab: (tab: Status) => void
  counts: TabCounts
}

export function VoicemailTabs({ tab, setTab, counts }: VoicemailTabsProps) {
  return (
    <div role="tablist" aria-label="Voicemail status" className="mb-1 mt-4 flex border-b border-rcp-rule">
      {STATUSES.map((s) => {
        const active = s === tab
        return (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setTab(s)}
            className={cn(
              '-mb-px inline-flex min-h-[48px] items-center gap-2.5 border-b-2 px-[18px] py-3.5 text-[15px] font-semibold',
              active
                ? 'border-rcp-terra-warm text-rcp-ink'
                : 'border-transparent text-rcp-brown hover:text-rcp-ink',
            )}
          >
            <span>{TAB_LABELS[s]}</span>
            <span
              className={cn(
                'rounded border px-[7px] py-0.5 font-rcp-mono text-[11px] font-semibold tracking-[0.03em] tabular-nums',
                active
                  ? 'border-rcp-terra-warm bg-rcp-terra-warm text-white'
                  : 'border-rcp-rule bg-rcp-tab-count-bg text-rcp-brown',
              )}
            >
              {String(counts[s]).padStart(2, '0')}
            </span>
          </button>
        )
      })}
    </div>
  )
}
