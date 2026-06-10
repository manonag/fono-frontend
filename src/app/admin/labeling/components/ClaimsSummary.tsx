'use client'

import type { LabelerSummary } from '../lib/types'

// Phase C.3 Sprint 1 (Bite 4): owner-only at-a-glance load board. Per labeler:
// open claims (claimed_by = them) and in_review (submitted, awaiting owner
// review). No dollar/bounty data anywhere, per standing decision.

interface ClaimsSummaryProps {
  byLabeler: LabelerSummary[] | undefined
}

export function ClaimsSummary({ byLabeler }: ClaimsSummaryProps) {
  const labelers = (byLabeler ?? []).filter((u) => u.role === 'labeler')
  if (labelers.length === 0) return null

  return (
    <div className="px-6 py-2 bg-cream border-b border-ink/10">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="font-semibold text-brown uppercase tracking-wide mr-1">
          Claims
        </span>
        {labelers.map((u) => {
          const claimed = u.counts.claimed ?? 0
          const inReview = u.counts.in_review
          return (
            <span
              key={u.id}
              className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-ink/10"
              title={`${u.name || u.email}: ${claimed} open claim(s), ${inReview} in review`}
            >
              <span className="font-semibold text-ink">{u.name || u.email}</span>
              <span className="text-terra font-semibold">{claimed}</span>
              <span className="text-brown">claimed</span>
              <span className="text-amber-700 font-semibold">{inReview}</span>
              <span className="text-brown">in review</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
