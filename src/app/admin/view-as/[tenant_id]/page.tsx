'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Tooltip } from '@/components/admin/Tooltip'
import type { AdminTenantOption } from '@/components/admin/TenantSelector'
import { config } from '@/lib/config'
import { useFonoToken } from '@/hooks/use-fono-token'
import '../../admin.css'

type Tab = 'dashboard' | 'calls' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'calls', label: 'All Calls' },
  { id: 'settings', label: 'Settings' },
]

const READ_ONLY_TIP =
  'Disabled in view-as mode. Sign in as the tenant owner to make changes.'

interface DashboardSummary {
  total_calls: number
  missed_calls: number
  answered_calls: number
  total_duration_seconds: number
  total_recordings: number
  period: string
}

interface CallItem {
  id: string
  caller_number: string
  status: string
  consent_given: boolean
  duration_seconds: number | null
  recording_url: string | null
  created_at: string
}

interface CallLog {
  calls: CallItem[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

interface SettingsPayload {
  id: string
  name: string
  phone_number: string | null
  callback_number: string | null
  owner_whatsapp: string | null
  owner_email: string | null
  sla_minutes: number
  online_order_url: string | null
  call_setup_path: string | null
  carrier_name: string | null
  line_type: string | null
  greeting_audio_url: string | null
  greeting_text: string | null
  greeting_voice: string | null
  call_forwarding_verified: boolean
  is_active: boolean
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString()
}

export default function ViewAsTenantPage() {
  const params = useParams<{ tenant_id: string }>()
  const tenantId = params?.tenant_id ?? ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = (searchParams.get('tab') as Tab | null) ?? 'dashboard'
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? tabParam : 'dashboard'

  const token = useFonoToken()
  const [authState, setAuthState] = useState<'loading' | 'allowed' | 'denied' | 'unauthenticated'>('loading')
  const [tenantName, setTenantName] = useState<string>('')

  useEffect(() => {
    if (token === undefined) return
    if (!token) {
      setAuthState('unauthenticated')
      return
    }
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/admin/me`, { headers: authHeaders(token) })
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

  useEffect(() => {
    if (authState !== 'allowed' || !token) return
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/admin/tenants`, {
      headers: authHeaders(token),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: { tenants: AdminTenantOption[] }) => {
        if (cancelled) return
        const match = json.tenants.find((t) => t.tenant_id === tenantId)
        setTenantName(match?.tenant_name ?? 'Unknown tenant')
      })
      .catch(() => {
        if (!cancelled) setTenantName('Unknown tenant')
      })
    return () => {
      cancelled = true
    }
  }, [authState, token, tenantId])

  const setTab = useCallback(
    (next: Tab) => {
      router.push(`/admin/view-as/${tenantId}?tab=${next}`)
    },
    [router, tenantId],
  )

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
          Your account does not have access to the Fono admin dashboard.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream text-ink font-sans">
      <div className="sticky top-0 z-40 bg-yellow-100 border-b border-yellow-300 text-yellow-900 px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="font-semibold">
          ⚠ Viewing as {tenantName || tenantId} &mdash; read-only mirror
        </div>
        <Link href="/admin" className="text-sm underline hover:no-underline">
          exit
        </Link>
      </div>

      <nav className="border-b border-ink/10 bg-white px-6">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? 'px-4 py-2 text-sm font-bold text-terra border-b-2 border-terra'
                  : 'px-4 py-2 text-sm text-brown hover:text-ink'
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      {token && tab === 'dashboard' && (
        <DashboardTab token={token} tenantId={tenantId} />
      )}
      {token && tab === 'calls' && <CallsTab token={token} tenantId={tenantId} />}
      {token && tab === 'settings' && (
        <SettingsTab token={token} tenantId={tenantId} />
      )}
    </main>
  )
}

interface TabProps {
  token: string
  tenantId: string
}

function DashboardTab({ token, tenantId }: TabProps) {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/admin/view-as/${tenantId}/dashboard?days=30`, {
      headers: authHeaders(token),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: DashboardSummary) => {
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Unknown error')
      })
    return () => {
      cancelled = true
    }
  }, [token, tenantId])

  if (error)
    return <p className="p-6 text-red-700 text-sm">Failed to load: {error}</p>
  if (!data) return <p className="p-6 text-brown text-sm">Loading...</p>

  const cards = [
    { label: 'Total calls (30d)', value: data.total_calls },
    { label: 'Missed', value: data.missed_calls },
    { label: 'Answered', value: data.answered_calls },
    { label: 'Recordings', value: data.total_recordings },
    {
      label: 'Total duration',
      value: formatDuration(data.total_duration_seconds),
    },
  ]

  return (
    <section className="p-6">
      <h2 className="text-lg font-bold mb-3">Dashboard ({data.period})</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-md border border-ink/10 p-3">
            <div className="text-xs text-brown">{c.label}</div>
            <div className="text-2xl font-bold mt-1">{c.value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CallsTab({ token, tenantId }: TabProps) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CallLog | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(
      `${config.apiUrl}/api/v1/admin/view-as/${tenantId}/calls?page=${page}&per_page=20`,
      { headers: authHeaders(token) },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: CallLog) => {
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Unknown error')
      })
    return () => {
      cancelled = true
    }
  }, [token, tenantId, page])

  if (error)
    return <p className="p-6 text-red-700 text-sm">Failed to load: {error}</p>
  if (!data) return <p className="p-6 text-brown text-sm">Loading...</p>

  return (
    <section className="p-6">
      <h2 className="text-lg font-bold mb-3">
        All Calls ({data.total} total, page {data.page} of {data.total_pages})
      </h2>
      <div className="bg-white rounded-md shadow-sm overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-ink/5 text-left">
            <tr>
              <th className="p-2">When</th>
              <th className="p-2">Caller</th>
              <th className="p-2">Status</th>
              <th className="p-2">Consent</th>
              <th className="p-2 text-right">Duration</th>
              <th className="p-2">Listen</th>
            </tr>
          </thead>
          <tbody>
            {data.calls.map((c) => (
              <tr key={c.id} className="border-t border-ink/10">
                <td className="p-2 text-brown">{formatTimestamp(c.created_at)}</td>
                <td className="p-2">{c.caller_number}</td>
                <td className="p-2">{c.status}</td>
                <td className="p-2">{c.consent_given ? 'yes' : 'no'}</td>
                <td className="p-2 text-right">{formatDuration(c.duration_seconds)}</td>
                <td className="p-2">
                  <Tooltip text={READ_ONLY_TIP}>
                    <button
                      type="button"
                      disabled
                      className="text-xs bg-gray-200 text-gray-500 px-2 py-1 rounded opacity-50 cursor-not-allowed pointer-events-none"
                    >
                      Listen
                    </button>
                  </Tooltip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-1 border rounded disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
          disabled={page >= data.total_pages}
          className="px-3 py-1 border rounded disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </section>
  )
}

function SettingsTab({ token, tenantId }: TabProps) {
  const [data, setData] = useState<SettingsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/admin/view-as/${tenantId}/settings`, {
      headers: authHeaders(token),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: SettingsPayload) => {
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Unknown error')
      })
    return () => {
      cancelled = true
    }
  }, [token, tenantId])

  if (error)
    return <p className="p-6 text-red-700 text-sm">Failed to load: {error}</p>
  if (!data) return <p className="p-6 text-brown text-sm">Loading...</p>

  const fields: { label: string; value: string | number | null | undefined }[] = [
    { label: 'Restaurant name', value: data.name },
    { label: 'Twilio number', value: data.phone_number },
    { label: 'Callback number', value: data.callback_number },
    { label: 'Owner WhatsApp', value: data.owner_whatsapp },
    { label: 'Owner email', value: data.owner_email },
    { label: 'SLA minutes', value: data.sla_minutes },
    { label: 'Online order URL', value: data.online_order_url },
    { label: 'Call setup path', value: data.call_setup_path },
    { label: 'Carrier', value: data.carrier_name },
    { label: 'Line type', value: data.line_type },
    { label: 'Greeting voice', value: data.greeting_voice },
    { label: 'Greeting text', value: data.greeting_text },
    {
      label: 'Forwarding verified',
      value: data.call_forwarding_verified ? 'yes' : 'no',
    },
    { label: 'Active', value: data.is_active ? 'yes' : 'no' },
  ]

  return (
    <section className="p-6">
      <h2 className="text-lg font-bold mb-3">Settings</h2>
      <div className="bg-white rounded-md shadow-sm divide-y divide-ink/10 max-w-2xl">
        {fields.map((f) => (
          <div key={f.label} className="px-3 py-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="text-sm font-semibold text-brown">{f.label}</div>
            <input
              type="text"
              readOnly
              disabled
              value={f.value == null || f.value === '' ? '—' : String(f.value)}
              className="text-sm bg-gray-50 border border-ink/10 rounded px-2 py-1 cursor-not-allowed"
            />
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Tooltip text={READ_ONLY_TIP}>
          <button
            type="button"
            disabled
            className="bg-gray-200 text-gray-500 px-4 py-2 rounded opacity-50 cursor-not-allowed pointer-events-none"
          >
            Save
          </button>
        </Tooltip>
      </div>
      {data.greeting_audio_url && (
        <div className="mt-3 text-xs text-brown">
          Greeting MP3: {data.greeting_audio_url}
        </div>
      )}
    </section>
  )
}
