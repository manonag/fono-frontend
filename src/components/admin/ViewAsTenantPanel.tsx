'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { config } from '@/lib/config'

/**
 * T-228 View as Tenant v1: read-only iframe impersonation panel.
 *
 * Owner-only. Lets the admin pick a tenant, pick a device width
 * (Desktop / Tablet 768px / Mobile 380px), and load the tenant's
 * real dashboard inside an iframe under a 15-minute read-only
 * impersonation JWT. Exit ends the session via backend (audit row)
 * and blanks the iframe; tenant selection stays so the admin can
 * re-enter without re-picking.
 *
 * Token is delivered via URL hash to keep it out of server logs,
 * referer headers, and browser history. See lib/impersonation.tsx.
 *
 * Backend endpoints:
 *   POST /api/v1/admin/impersonation/sessions          (start, owner-only)
 *   POST /api/v1/admin/impersonation/sessions/:id/end  (end)
 */

interface AdminTenantOption {
  tenant_id: string
  tenant_name: string
  owner_email: string | null
  is_demo: boolean
}

interface StartSessionResponse {
  token: string
  expires_at: string
  session_id: string
  tenant_id: string
  tenant_name: string
  admin_email: string
  device_mode: string
  ttl_minutes: number
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile'

interface DeviceSpec {
  mode: DeviceMode
  label: string
  pixelWidth: number | null
  pixelLabel: string
}

const DEVICES: DeviceSpec[] = [
  { mode: 'desktop', label: 'Desktop', pixelWidth: null, pixelLabel: 'full width' },
  { mode: 'tablet', label: 'Tablet', pixelWidth: 768, pixelLabel: '768px' },
  { mode: 'mobile', label: 'Mobile', pixelWidth: 380, pixelLabel: '380px' },
]

const IFRAME_HEIGHT_PX = 800
const IFRAME_TARGET_PATH = '/dashboard'

interface ViewAsTenantPanelProps {
  token: string
  includeDemo: boolean
}

export function ViewAsTenantPanel({ token, includeDemo }: ViewAsTenantPanelProps) {
  const [tenants, setTenants] = useState<AdminTenantOption[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [search, setSearch] = useState<string>('')
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop')
  const [session, setSession] = useState<StartSessionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/admin/tenants?include_demo=${includeDemo}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ tenants: AdminTenantOption[] }>
      })
      .then((json) => {
        if (cancelled) return
        setTenants(json.tenants)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load tenants')
      })
    return () => {
      cancelled = true
    }
  }, [token, includeDemo])

  const filteredTenants = useMemo(() => {
    if (!search.trim()) return tenants
    const q = search.trim().toLowerCase()
    return tenants.filter(
      (t) =>
        t.tenant_name.toLowerCase().includes(q) ||
        (t.owner_email ?? '').toLowerCase().includes(q),
    )
  }, [tenants, search])

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.tenant_id === selectedId) ?? null,
    [tenants, selectedId],
  )

  const startSession = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `${config.apiUrl}/api/v1/admin/impersonation/sessions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tenant_id: selectedId,
            device_mode: deviceMode,
          }),
        },
      )
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || `HTTP ${res.status}`)
      }
      const json = (await res.json()) as StartSessionResponse
      setSession(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start impersonation')
    } finally {
      setLoading(false)
    }
  }, [selectedId, deviceMode, token])

  const endSession = useCallback(
    async (sess: StartSessionResponse, endedVia: 'exit_button' | 'navigation') => {
      try {
        await fetch(
          `${config.apiUrl}/api/v1/admin/impersonation/sessions/${sess.session_id}/end`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ended_via: endedVia }),
          },
        )
      } catch {
        // Best-effort: never block UX on /end audit write
      }
    },
    [token],
  )

  const handleExit = useCallback(async () => {
    const sess = session
    if (!sess) return
    setSession(null)
    await endSession(sess, 'exit_button')
  }, [session, endSession])

  // Fire /end on tab close / navigation away (best-effort).
  useEffect(() => {
    if (!session) return
    const sess = session
    const onUnload = () => {
      navigator.sendBeacon?.(
        `${config.apiUrl}/api/v1/admin/impersonation/sessions/${sess.session_id}/end`,
        new Blob(
          [JSON.stringify({ ended_via: 'navigation' })],
          { type: 'application/json' },
        ),
      )
    }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [session])

  const iframeSrc = useMemo(() => {
    if (!session) return ''
    const params = new URLSearchParams({
      impersonation_token: session.token,
      session_id: session.session_id,
      admin_email: session.admin_email,
      tenant_id: session.tenant_id,
      tenant_name: encodeURIComponent(session.tenant_name),
    }).toString()
    return `${IFRAME_TARGET_PATH}?impersonation=1#${params}`
  }, [session])

  const activeDevice = DEVICES.find((d) => d.mode === deviceMode) ?? DEVICES[0]
  const iframeWidth = activeDevice.pixelWidth
    ? `${activeDevice.pixelWidth}px`
    : '100%'

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-ink">View as Tenant</h2>
          <p className="text-xs text-brown">
            Read-only preview. 15 minute session. Audit logged.
          </p>
        </div>
        {session ? (
          <div className="flex items-center gap-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow">
            <span>
              Impersonating: <strong>{session.tenant_name}</strong>
              {' · '}
              {activeDevice.label} ({activeDevice.pixelLabel})
            </span>
            <button
              type="button"
              onClick={handleExit}
              className="rounded-md bg-white/15 px-2 py-1 text-xs font-bold hover:bg-white/25"
              data-testid="impersonation-exit"
            >
              Exit
            </button>
          </div>
        ) : null}
      </header>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[240px]">
          <span className="block text-xs font-semibold text-brown">Tenant</span>
          <input
            type="text"
            placeholder="Filter tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-terra focus:outline-none"
          />
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-terra focus:outline-none"
          >
            <option value="">{tenants.length ? 'Pick a tenant...' : 'Loading...'}</option>
            {filteredTenants.map((t) => (
              <option key={t.tenant_id} value={t.tenant_id}>
                {t.tenant_name}
                {t.is_demo ? ' (demo)' : ''}
                {t.owner_email ? ` - ${t.owner_email}` : ''}
              </option>
            ))}
          </select>
        </label>

        <div>
          <span className="block text-xs font-semibold text-brown">Device</span>
          <div className="mt-1 inline-flex rounded-lg border border-black/10 bg-white p-1">
            {DEVICES.map((d) => (
              <button
                key={d.mode}
                type="button"
                onClick={() => setDeviceMode(d.mode)}
                className={
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ' +
                  (deviceMode === d.mode
                    ? 'bg-terra text-white'
                    : 'text-brown hover:bg-black/5')
                }
              >
                {d.label} ({d.pixelLabel})
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={startSession}
          disabled={!selectedId || loading}
          className="rounded-lg bg-terra px-4 py-2 text-sm font-bold text-white shadow transition-colors hover:bg-terra-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Starting...' : session ? 'Reopen iframe' : 'Open in iframe'}
        </button>
      </div>

      {error ? (
        <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {session ? (
        <div className="mt-2 flex justify-center overflow-auto rounded-xl bg-black/5 p-3">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            title={`View as ${session.tenant_name}`}
            className="rounded-lg border border-black/10 bg-white shadow-inner"
            style={{
              width: iframeWidth,
              maxWidth: '100%',
              height: `${IFRAME_HEIGHT_PX}px`,
              transition: 'width 120ms ease',
            }}
          />
        </div>
      ) : (
        selectedTenant ? (
          <div className="rounded-xl border border-dashed border-black/10 bg-cream px-4 py-6 text-center text-sm text-brown">
            Selected: <strong>{selectedTenant.tenant_name}</strong>. Pick a device
            width and click <em>Open in iframe</em> to start a 15-minute read-only session.
          </div>
        ) : null
      )}
    </section>
  )
}
