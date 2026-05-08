'use client'

import { Tooltip } from '@/components/admin/Tooltip'

export interface Blocker {
  blocker_id: string
  title: string
  chiran_task_label: string
  since: string
  days_active: number
  tooltip: string
  suppressed_alarm_ids: string[]
  suppressed_health_check_ids: number[]
}

interface BlockersSurfaceProps {
  blockers: Blocker[]
}

export function BlockersSurface({ blockers }: BlockersSurfaceProps) {
  if (blockers.length === 0) return null

  return (
    <section className="mx-6 my-4 border border-amber-300 bg-amber-50 rounded-lg p-4">
      <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
        <h2 className="font-semibold text-amber-900">
          Active Platform Blockers ({blockers.length})
        </h2>
        <span className="text-xs text-amber-700">
          Affected alarms and health checks are hidden while these are open.
        </span>
      </div>
      <ul className="space-y-2">
        {blockers.map((b) => {
          const suppressedTotal =
            b.suppressed_alarm_ids.length + b.suppressed_health_check_ids.length
          const stale = b.days_active > 14
          return (
            <li
              key={b.blocker_id}
              className="bg-white border border-amber-200 rounded p-3"
            >
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <div>
                  <Tooltip text={b.tooltip}>
                    <span className="font-medium text-amber-900">{b.title}</span>
                  </Tooltip>
                  <span className="ml-2 text-xs text-amber-700">
                    {b.chiran_task_label} &middot; since {b.since} &middot; {b.days_active}{' '}
                    {b.days_active === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <span
                  className={
                    stale
                      ? 'text-xs px-2 py-0.5 rounded bg-red-100 text-red-800'
                      : 'text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800'
                  }
                >
                  {suppressedTotal} {suppressedTotal === 1 ? 'signal' : 'signals'} suppressed
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
