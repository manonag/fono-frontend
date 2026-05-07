'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlarmBell } from '@/components/admin/AlarmBell'
import { PlatformVitals } from '@/components/admin/PlatformVitals'
import { TenantSelector } from '@/components/admin/TenantSelector'
import { Tooltip } from '@/components/admin/Tooltip'
import { config } from '@/lib/config'
import { useFonoToken } from '@/hooks/use-fono-token'
import './admin.css'

type Severity = 'red' | 'yellow' | 'green'

interface Flag {
  id: number
  severity: Severity
  label: string
}

interface KioskUsage {
  completed: number
  total: number
  is_kiosk_specific: boolean
}

interface RecordingsCell {
  r2_count: number
  db_count: number
  expired_count: number
}

interface TenantHealthRow {
  tenant_id: string
  tenant_name: string
  owner_email: string | null
  forwarding_verified: boolean
  last_call_at: string | null
  calls_24h: number
  pending_callbacks: number
  stale_past_sla: number
  stale_on_kiosk: number
  kiosk_usage_24h: KioskUsage
  recordings: RecordingsCell
  flags: Flag[]
  row_severity: Severity
}

interface HealthResponse {
  tenants: TenantHealthRow[]
  fetched_at: string
  r2_listing_fetched_at: string | null
  elapsed_ms: number
}

type SortKey =
  | 'tenant_name'
  | 'last_call_at'
  | 'calls_24h'
  | 'pending_callbacks'
  | 'stale_past_sla'
  | 'stale_on_kiosk'
  | 'kiosk_usage_pct'
  | 'recordings_r2'
  | 'row_severity'

interface SortState {
  key: SortKey
  direction: 'asc' | 'desc'
}

const SEVERITY_RANK: Record<Severity, number> = { red: 3, yellow: 2, green: 1 }

const TOOLTIPS = {
  forwarding:
    "Whether call forwarding from the restaurant's main number to Fono is verified. Auto-flips to true when an inbound Caller matches the tenant's callback_number.",
  last_call:
    'Most recent inbound call (any status). NULL means this tenant has never received a call.',
  calls_24h: 'Total inbound calls in the last 24 hours, regardless of status.',
  pending_callbacks:
    'Calls with callback_status pending/calling/no-rest-answer or NULL where call_status=NO_ANSWER. Mirrors the kiosk missed-tab states.',
  stale_past_sla:
    'Calls with callback_status=pending whose sla_deadline has already passed. Driver of check #3 (red).',
  stale_on_kiosk:
    'Stale calls still visible on the tenant kiosk (kiosk filter + sla_deadline < now). Yellow when >0, red when >5. See T-194.',
  kiosk_usage:
    'Format: completed / total (percent). Currently shows TOTAL recovery rate, not kiosk-specific, because callback_status=recovered is set from multiple paths. Will be split once T-195 ships.',
  recordings:
    'Format: R2 objects / DB rows (expired). Number in parens = recordings whose stored r2_url is past the 24h presigned expiry. Mismatched R2 vs DB raises check #11.',
  flags:
    'Health checks raised for this tenant. Hover/tap each chip for the full description.',
  row_color:
    'Row color reflects highest severity flag: red > yellow > green.',
} as const

const FLAG_TOOLTIPS: Record<number, string> = {
  1: 'This tenant signed up but their carrier-level call forwarding was never verified. Calls may not actually reach Fono. Auto-verifies when an inbound call arrives from their callback_number.',
  2: "This active tenant hasn't received any inbound call in 48+ hours. Forwarding may be silently broken, or restaurant may genuinely be closed.",
  3: 'Customer was promised a callback within the SLA window (default 15 min) and the deadline has passed without a recovery action. Tenant is falling behind.',
  4: "Owner WhatsApp number is set to the published business phone, which is often a landline that can't receive WhatsApp messages. Owner is not getting recording notifications. See T-184.",
  5: 'Call was answered but never transitioned to COMPLETED. Twilio status callback may have failed. Was the root cause of T-183. Check status_callback URL on Twilio number.',
  6: 'Recording row exists in DB but r2_url is NULL. R2 upload silently failed. Files may exist in R2 anyway. Check the bucket directly before assuming data loss.',
  7: 'This tenant has no user_tenants links, meaning no user owns it. May be from a partial signup or a deletion that did not cascade. Cannot be accessed via the UI.',
  8: 'Notification delivery is failing more than half the time over the last 24 hours. SMS often means A2P 10DLC blocker (Twilio 30034). WhatsApp often means Sandbox opt-in expired or owner_whatsapp is a landline.',
  9: "Calls that exceed the SLA window and are still showing as 'pending' on the tenant's kiosk. Mirror of what the owner sees on their kiosk's missed-calls tab. Count >5 indicates accumulation problem.",
  10: 'Tenant got missed calls in last 24h but never used the kiosk to recover them. Either kiosk is broken, owner is ignoring it, or recovery flow is broken. Strong signal for pilot evaluation.',
  11: 'Mismatch between database recording rows and actual MP3 files in R2 storage. Either DB rows without R2 files (failed upload) or R2 files without DB rows (orphan storage). Either direction means data inconsistency.',
  12: "Recordings whose stored URL is past the 24h presigned expiry window. Dashboard 'Listen' button will return 403. Files exist in R2; URLs need regeneration. Mitigated when T-190 ships.",
}

function rowBg(severity: Severity): string {
  if (severity === 'red') return 'bg-red-50'
  if (severity === 'yellow') return 'bg-yellow-50'
  return ''
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString()
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'never'
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function sortValue(row: TenantHealthRow, key: SortKey): number | string {
  switch (key) {
    case 'tenant_name':
      return row.tenant_name.toLowerCase()
    case 'last_call_at':
      return row.last_call_at ? new Date(row.last_call_at).getTime() : 0
    case 'calls_24h':
      return row.calls_24h
    case 'pending_callbacks':
      return row.pending_callbacks
    case 'stale_past_sla':
      return row.stale_past_sla
    case 'stale_on_kiosk':
      return row.stale_on_kiosk
    case 'kiosk_usage_pct':
      return row.kiosk_usage_24h.total === 0
        ? -1
        : row.kiosk_usage_24h.completed / row.kiosk_usage_24h.total
    case 'recordings_r2':
      return row.recordings.r2_count
    case 'row_severity':
      return SEVERITY_RANK[row.row_severity]
  }
}

export default function AdminPage() {
  const token = useFonoToken()
  const [authState, setAuthState] = useState<'loading' | 'allowed' | 'denied' | 'unauthenticated'>('loading')
  const [data, setData] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshLabel, setLastRefreshLabel] = useState<string>('')
  const [sort, setSort] = useState<SortState>({ key: 'row_severity', direction: 'desc' })

  useEffect(() => {
    if (token === undefined) return
    if (!token) {
      setAuthState('unauthenticated')
      return
    }
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (cancelled) return
        if (r.status === 200) setAuthState('allowed')
        else if (r.status === 403) setAuthState('denied')
        else setAuthState('unauthenticated')
      })
      .catch(() => {
        if (!cancelled) setAuthState('denied')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const loadHealth = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/admin/tenants/health`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        setError(`Failed to load: HTTP ${res.status}`)
        return
      }
      const json: HealthResponse = await res.json()
      setData(json)
      setError(null)
      setLastRefreshLabel(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [token])

  useEffect(() => {
    if (authState !== 'allowed') return
    loadHealth()
    const id = setInterval(loadHealth, 30_000)
    return () => clearInterval(id)
  }, [authState, loadHealth])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isFormControl = target.closest(
        "select, input, textarea, button, [role='combobox'], [role='listbox'], option",
      )
      if (!target.closest('.tooltip-trigger') && !isFormControl) {
        ;(document.activeElement as HTMLElement | null)?.blur()
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const sortedRows = useMemo(() => {
    if (!data) return []
    const rows = [...data.tenants]
    rows.sort((a, b) => {
      const av = sortValue(a, sort.key)
      const bv = sortValue(b, sort.key)
      if (av < bv) return sort.direction === 'asc' ? -1 : 1
      if (av > bv) return sort.direction === 'asc' ? 1 : -1
      return 0
    })
    return rows
  }, [data, sort])

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key
        ? { key, direction: s.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'tenant_name' ? 'asc' : 'desc' },
    )
  }

  if (authState === 'loading') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <p className="text-brown">Checking access...</p>
      </main>
    )
  }
  if (authState === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <p>You need to sign in to view this page.</p>
      </main>
    )
  }
  if (authState === 'denied') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <h1 className="text-2xl font-bold mb-2">No admin access</h1>
        <p className="text-brown">
          Your account does not have access to the Fono admin dashboard. If you believe this is wrong, contact Mano.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream text-ink font-sans">
      <header className="bg-ink text-cream px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold">Fono Admin</h1>
            <p className="text-xs text-cream/70">Sections 1-3: Tenant Health, Alarm Bell, Platform Vitals</p>
          </div>
          <div className="text-xs text-cream/70">
            Auto-refreshing every 30s
            {lastRefreshLabel && <> &middot; Last refresh: {lastRefreshLabel}</>}
            {data && (
              <> &middot; {data.tenants.length} tenants &middot; {data.elapsed_ms}ms</>
            )}
          </div>
        </div>
      </header>

      {token && <TenantSelector token={token} />}

      <section className="p-6 overflow-x-auto">
        <h2 className="text-lg font-bold mb-3">Section 1: Tenant Health</h2>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>
        )}
        {!data && !error && <p className="text-brown text-sm">Loading...</p>}
        {data && (
          <table className="min-w-full border-collapse text-sm bg-white rounded-md shadow-sm">
            <thead className="bg-ink/5 text-left">
              <tr>
                <th className="p-2 sort-header" onClick={() => toggleSort('row_severity')}>
                  <Tooltip text={TOOLTIPS.row_color}>Sev</Tooltip>
                </th>
                <th className="p-2 sort-header" onClick={() => toggleSort('tenant_name')}>
                  Tenant
                </th>
                <th className="p-2">Owner email</th>
                <th className="p-2">
                  <Tooltip text={TOOLTIPS.forwarding}>Forwarding</Tooltip>
                </th>
                <th className="p-2 sort-header" onClick={() => toggleSort('last_call_at')}>
                  <Tooltip text={TOOLTIPS.last_call}>Last call</Tooltip>
                </th>
                <th className="p-2 sort-header text-right" onClick={() => toggleSort('calls_24h')}>
                  <Tooltip text={TOOLTIPS.calls_24h}>Calls 24h</Tooltip>
                </th>
                <th className="p-2 sort-header text-right" onClick={() => toggleSort('pending_callbacks')}>
                  <Tooltip text={TOOLTIPS.pending_callbacks}>Pending</Tooltip>
                </th>
                <th className="p-2 sort-header text-right" onClick={() => toggleSort('stale_past_sla')}>
                  <Tooltip text={TOOLTIPS.stale_past_sla}>Stale (SLA)</Tooltip>
                </th>
                <th className="p-2 sort-header text-right" onClick={() => toggleSort('stale_on_kiosk')}>
                  <Tooltip text={TOOLTIPS.stale_on_kiosk}>Stale (kiosk)</Tooltip>
                </th>
                <th className="p-2 sort-header text-right" onClick={() => toggleSort('kiosk_usage_pct')}>
                  <Tooltip text={TOOLTIPS.kiosk_usage}>Kiosk usage 24h</Tooltip>
                </th>
                <th className="p-2 sort-header text-right" onClick={() => toggleSort('recordings_r2')}>
                  <Tooltip text={TOOLTIPS.recordings}>Recordings</Tooltip>
                </th>
                <th className="p-2">
                  <Tooltip text={TOOLTIPS.flags}>Flags</Tooltip>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => {
                const ku = row.kiosk_usage_24h
                const pct = ku.total === 0 ? '—' : `${Math.round((ku.completed / ku.total) * 100)}%`
                return (
                  <tr
                    key={row.tenant_id}
                    className={`border-t border-ink/10 ${rowBg(row.row_severity)}`}
                  >
                    <td className="p-2 font-bold uppercase text-xs">{row.row_severity}</td>
                    <td className="p-2 font-semibold">{row.tenant_name}</td>
                    <td className="p-2 text-brown">{row.owner_email || '—'}</td>
                    <td className="p-2">
                      {row.forwarding_verified ? (
                        <span className="text-green-700">verified</span>
                      ) : (
                        <span className="text-red-700">unverified</span>
                      )}
                    </td>
                    <td className="p-2 text-brown" title={formatTime(row.last_call_at)}>
                      {formatRelative(row.last_call_at)}
                    </td>
                    <td className="p-2 text-right">{row.calls_24h}</td>
                    <td className="p-2 text-right">{row.pending_callbacks}</td>
                    <td className="p-2 text-right">{row.stale_past_sla}</td>
                    <td className="p-2 text-right">{row.stale_on_kiosk}</td>
                    <td className="p-2 text-right">
                      <Tooltip
                        text={
                          ku.is_kiosk_specific
                            ? `${ku.completed} kiosk callbacks completed in last 24h, paired with ${ku.total} missed calls.`
                            : `${ku.completed} total recoveries / ${ku.total} missed calls. NOT kiosk-specific (no source attribution yet). Will be split once T-195 ships.`
                        }
                      >
                        {`${ku.completed} / ${ku.total} (${pct})`}
                      </Tooltip>
                    </td>
                    <td className="p-2 text-right">
                      <Tooltip
                        text={`R2 ${row.recordings.r2_count}, DB ${row.recordings.db_count}, ${row.recordings.expired_count} expired URLs.`}
                      >
                        {`${row.recordings.r2_count} / ${row.recordings.db_count} (${row.recordings.expired_count} expired)`}
                      </Tooltip>
                    </td>
                    <td className="p-2">
                      {row.flags.length === 0 ? (
                        <span className="text-green-700 text-xs">healthy</span>
                      ) : (
                        row.flags.map((flag) => (
                          <span
                            key={flag.id}
                            className={`flag-chip flag-chip-${flag.severity} tooltip-trigger`}
                            tabIndex={0}
                          >
                            #{flag.id} {flag.label}
                            <span className="tooltip-text" role="tooltip">
                              {FLAG_TOOLTIPS[flag.id] || flag.label}
                            </span>
                          </span>
                        ))
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {token && <AlarmBell token={token} />}
      {token && <PlatformVitals token={token} />}
    </main>
  )
}
