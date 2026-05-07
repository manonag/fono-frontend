'use client'

import { useEffect, useMemo, useState } from 'react'
import { Tooltip } from '@/components/admin/Tooltip'
import { config } from '@/lib/config'

type Severity = 'red' | 'yellow' | 'green'

interface TenantBreakdown {
  tenant_id: string
  tenant_name: string
  is_demo: boolean
  count_for_tenant: number
}

interface Alarm {
  id: string
  label: string
  severity: Severity
  count: number
  tenants: TenantBreakdown[]
  tooltip: string
  is_dormant: boolean
}

interface AlarmsResponse {
  alarms: Alarm[]
  all_healthy: boolean
  fetched_at: string
  elapsed_ms: number
}

interface AlarmBellProps {
  token: string
  includeDemo: boolean
}

const SEVERITY_RANK: Record<Severity, number> = { red: 3, yellow: 2, green: 1 }

function rowClasses(severity: Severity, dormant: boolean): string {
  if (dormant) return 'bg-gray-50 border-gray-200 text-gray-500'
  if (severity === 'red') return 'bg-red-50 border-red-200 text-red-900'
  if (severity === 'yellow') return 'bg-yellow-50 border-yellow-200 text-yellow-900'
  return 'bg-green-50 border-green-200 text-green-900'
}

export function AlarmBell({ token, includeDemo }: AlarmBellProps) {
  const [data, setData] = useState<AlarmsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(
          `${config.apiUrl}/api/v1/admin/alarms?include_demo=${includeDemo}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (!res.ok) {
          if (!cancelled) setError(`Failed to load alarms: HTTP ${res.status}`)
          return
        }
        const json: AlarmsResponse = await res.json()
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }
    load()
    const id = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [token, includeDemo])

  const { active, dormant } = useMemo(() => {
    if (!data) return { active: [] as Alarm[], dormant: [] as Alarm[] }
    const active = data.alarms.filter((a) => !a.is_dormant && a.count > 0)
    const dormant = data.alarms.filter((a) => a.is_dormant)
    active.sort((a, b) => {
      const sd = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
      if (sd !== 0) return sd
      return b.count - a.count
    })
    return { active, dormant }
  }, [data])

  return (
    <section className="p-6">
      <h2 className="text-lg font-bold mb-3">Section 2: Alarm Bell</h2>
      {error && (
        <div className="mb-3 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>
      )}
      {!data && !error && <p className="text-brown text-sm">Loading...</p>}
      {data && data.all_healthy && active.length === 0 && (
        <div className="mb-3 p-3 rounded border bg-green-50 border-green-200 text-green-800 text-sm font-semibold">
          All systems healthy
        </div>
      )}
      {data && active.length > 0 && (
        <p className="text-sm text-brown mb-2">
          {active.length} active {active.length === 1 ? 'alarm' : 'alarms'}
        </p>
      )}
      {data && active.length > 0 && (
        <ul className="space-y-2">
          {active.map((alarm) => (
            <li
              key={alarm.id}
              className={`border rounded-md px-3 py-2 ${rowClasses(alarm.severity, false)}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">
                  <Tooltip text={alarm.tooltip}>{alarm.label}</Tooltip>
                </div>
                <div className="text-sm font-bold">{alarm.count}</div>
              </div>
              {alarm.tenants.length > 0 && (
                <div className="text-xs mt-1 opacity-80 flex flex-wrap gap-x-2 gap-y-1">
                  {alarm.tenants.map((t, i) => (
                    <span key={t.tenant_id}>
                      {t.tenant_name}
                      {t.is_demo && (
                        <span className="ml-1 inline-block px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-gray-200 text-gray-600 rounded">
                          demo
                        </span>
                      )}
                      {' '}({t.count_for_tenant}){i < alarm.tenants.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {data && dormant.length > 0 && (
        <>
          <p className="mt-4 mb-2 text-xs uppercase tracking-wide text-brown">
            Dormant (not yet wired)
          </p>
          <ul className="space-y-2">
            {dormant.map((alarm) => (
              <li
                key={alarm.id}
                className={`border rounded-md px-3 py-2 ${rowClasses(alarm.severity, true)}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold italic">
                    <Tooltip text={alarm.tooltip}>{alarm.label}</Tooltip>
                  </div>
                  <div className="text-xs">dormant</div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
