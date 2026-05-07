'use client'

import { useEffect, useState } from 'react'
import { Tooltip } from '@/components/admin/Tooltip'
import { config } from '@/lib/config'

type Severity = 'red' | 'yellow' | 'green'

interface Vital {
  id: string
  label: string
  value: string
  raw: number | string | null
  severity: Severity
  tooltip: string
}

interface VitalsResponse {
  vitals: Vital[]
  fetched_at: string
  elapsed_ms: number
}

interface PlatformVitalsProps {
  token: string
}

function dotClass(severity: Severity): string {
  if (severity === 'red') return 'bg-red-500'
  if (severity === 'yellow') return 'bg-yellow-500'
  return 'bg-green-500'
}

export function PlatformVitals({ token }: PlatformVitalsProps) {
  const [data, setData] = useState<VitalsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${config.apiUrl}/api/v1/admin/vitals`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (!cancelled) setError(`Failed to load vitals: HTTP ${res.status}`)
          return
        }
        const json: VitalsResponse = await res.json()
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
  }, [token])

  return (
    <section className="p-6 border-t border-ink/10">
      <h2 className="text-lg font-bold mb-3">Section 3: Platform Vitals</h2>
      {error && (
        <div className="mb-3 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>
      )}
      {!data && !error && <p className="text-brown text-sm">Loading...</p>}
      {data && (
        <ul className="bg-white rounded-md shadow-sm divide-y divide-ink/10">
          {data.vitals.map((v) => (
            <li key={v.id} className="px-3 py-2 flex items-center gap-3">
              <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${dotClass(v.severity)}`} aria-label={v.severity} />
              <div className="font-semibold w-56 shrink-0">
                <Tooltip text={v.tooltip}>{v.label}</Tooltip>
              </div>
              <div className="text-sm text-ink/80 flex-1">{v.value}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
