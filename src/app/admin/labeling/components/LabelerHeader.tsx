'use client'

import type { ActiveLabeler, LabelerSummary, MeResponse } from '../lib/types'

interface LabelerHeaderProps {
  me: MeResponse | null
  myCounts: { verified: number; in_review: number } | null
  activeLabelers: ActiveLabeler[]
}

function formatActivePill(count: number): string {
  if (count === 0) return 'No labelers active'
  if (count === 1) return '1 labeler active'
  return `${count} labelers active`
}

export function LabelerHeader({
  me,
  myCounts,
  activeLabelers,
}: LabelerHeaderProps) {
  const displayName = me?.name?.trim() || me?.email || '—'
  const isOwner = me?.role === 'owner'
  const otherActive = me
    ? activeLabelers.filter((u) => u.user_id !== me.user_id).length
    : activeLabelers.length

  return (
    <div className="flex items-center gap-4 px-6 py-2 bg-cream border-b border-ink/10 text-xs text-ink">
      {isOwner ? (
        <span className="font-semibold">
          Owner: <span className="text-ink">{displayName}</span>
        </span>
      ) : (
        <span>
          <span className="text-brown">Logged in as</span>{' '}
          <span className="font-semibold text-ink">{displayName}</span>
          {myCounts && (
            <>
              <span className="text-brown"> · </span>
              <span className="font-semibold text-green-700">
                {myCounts.verified}
              </span>{' '}
              <span className="text-brown">verified</span>
              <span className="text-brown"> · </span>
              <span className="font-semibold text-amber-700">
                {myCounts.in_review}
              </span>{' '}
              <span className="text-brown">in review</span>
            </>
          )}
        </span>
      )}
      <span
        className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[11px] font-semibold"
        title={
          activeLabelers.length === 0
            ? 'Nobody else is labeling right now.'
            : activeLabelers
                .map((u) => `${u.name ?? u.email} (${u.role})`)
                .join(', ')
        }
      >
        <span
          className={
            otherActive > 0
              ? 'h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse'
              : 'h-1.5 w-1.5 rounded-full bg-brown/40'
          }
        />
        {formatActivePill(activeLabelers.length)}
      </span>
      {isOwner && (
        <nav className="flex items-center gap-3 text-xs">
          <a
            href="/admin/labeling/review"
            className="text-terra hover:text-terra-dark underline"
          >
            Review queue
          </a>
          <a
            href="/admin/users"
            className="text-terra hover:text-terra-dark underline"
          >
            Users
          </a>
        </nav>
      )}
    </div>
  )
}

export function deriveMyCounts(
  me: MeResponse | null,
  byLabeler: LabelerSummary[] | undefined,
): { verified: number; in_review: number } | null {
  if (!me || !byLabeler) return null
  const row = byLabeler.find((u) => u.id === me.user_id)
  if (!row) return { verified: 0, in_review: 0 }
  return { verified: row.counts.verified, in_review: row.counts.in_review }
}
