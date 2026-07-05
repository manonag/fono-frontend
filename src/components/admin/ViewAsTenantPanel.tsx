'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { config } from '@/lib/config'
import {
  impersonationPopoutUrl,
  popoutWindowName,
  shouldRefreshToken,
  type PopoutView,
} from '@/lib/impersonation-popout'

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
  tenant_timezone: string
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

const IFRAME_HEIGHT_CSS = 'min(80vh, 1024px)'
const IFRAME_TARGET_PATH = '/dashboard'
const KIOSK_IFRAME_TARGET_PATH = '/kiosk'
const KIOSK_DEVICE_WIDTH_PX = 768
const STACK_BREAKPOINT_PX = 1180

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
  const [kioskVisible, setKioskVisible] = useState(true)
  const [stacked, setStacked] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const prevKioskVisibleRef = useRef(false)
  const prevSessionIdRef = useRef<string | null>(null)
  // Popped-out child windows, keyed by window name. Tracked so End
  // Impersonation can close them and repeat clicks can focus instead of
  // duplicating. See openPopout / closePopouts below.
  const popoutsRef = useRef<Map<string, Window>>(new Map())

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

  // Close every popped-out window we still hold a live ref to. Refs whose
  // window the user already closed report .closed === true and are skipped.
  const closePopouts = useCallback(() => {
    popoutsRef.current.forEach((w) => {
      if (!w.closed) w.close()
    })
    popoutsRef.current.clear()
  }, [])

  const handleExit = useCallback(async () => {
    const sess = session
    if (!sess) return
    closePopouts()
    setSession(null)
    await endSession(sess, 'exit_button')
  }, [session, endSession, closePopouts])

  // Mint a fresh impersonation token for the same tenant/device. Used only
  // when the current token is within POPOUT_TOKEN_REFRESH_THRESHOLD_MS of
  // expiry at pop-out click time. Returns null on any failure so the caller
  // can fall back to the current token rather than opening a dead window.
  const refreshSession = useCallback(
    async (sess: StartSessionResponse): Promise<StartSessionResponse | null> => {
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
              tenant_id: sess.tenant_id,
              device_mode: sess.device_mode,
            }),
          },
        )
        if (!res.ok) return null
        return (await res.json()) as StartSessionResponse
      } catch {
        return null
      }
    },
    [token],
  )

  // Open the given view (dashboard/kiosk) in its own browser window, loading
  // the exact same URL the inline iframe uses. Popup-blocker safe: window.open
  // runs synchronously in this click handler with no await before it. When the
  // token is near expiry we still open synchronously (to about:blank) and then
  // navigate once a fresh token is minted.
  const openPopout = useCallback(
    (view: PopoutView, path: string) => {
      const sess = session
      if (!sess) return
      const name = popoutWindowName(view, sess.tenant_id)

      // Repeat click: focus the existing window instead of reloading it.
      const existing = popoutsRef.current.get(name)
      if (existing && !existing.closed) {
        existing.focus()
        return
      }

      if (!shouldRefreshToken(sess.expires_at, Date.now())) {
        const win = window.open(impersonationPopoutUrl(path, sess), name)
        if (win) {
          popoutsRef.current.set(name, win)
          win.focus()
        }
        return
      }

      // Near expiry: open synchronously, then swap in a fresh token. Minting
      // a new session refreshes the whole panel (both inline iframes reload
      // onto the new token) so everything shares one live session.
      const win = window.open('about:blank', name)
      if (!win) return
      popoutsRef.current.set(name, win)
      win.focus()
      void refreshSession(sess).then((fresh) => {
        const next = fresh ?? sess
        if (fresh) {
          setSession(fresh)
          // Old session is abandoned in favor of the fresh one; record the
          // handoff so audit duration isn't left open (best-effort).
          void endSession(sess, 'navigation')
        }
        if (!win.closed) win.location.replace(impersonationPopoutUrl(path, next))
      })
    },
    [session, refreshSession, endSession],
  )

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

  // T-437f21f4 Q2: stack the two iframes vertically when panel inner width
  // is below the breakpoint. ResizeObserver on the panel section root,
  // not viewport, so this works correctly regardless of sidebar width or
  // surrounding chrome. Tailwind container-queries plugin is not installed
  // (verified Phase 2); inline ResizeObserver is the zero-dep alternative.
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setStacked(entry.contentRect.width < STACK_BREAKPOINT_PX)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // T-437f21f4 Q4: when the kiosk iframe first becomes visible during a
  // session (or a fresh session starts with kiosk visible), default the
  // dashboard device toggle to Mobile (380px). 380 + 768 + gap fits the
  // 1180px breakpoint comfortably. After the default, the toggle is fully
  // user-controllable; this effect only fires on transitions, never
  // mid-session within a single show. Dev-mode HMR may remount and
  // re-fire (harmless; refs reset).
  useEffect(() => {
    const currentSessionId = session?.session_id ?? null
    const kioskShowEvent = kioskVisible && !prevKioskVisibleRef.current
    const sessionStartEvent =
      currentSessionId !== null && currentSessionId !== prevSessionIdRef.current

    if (kioskVisible && session && (kioskShowEvent || sessionStartEvent)) {
      setDeviceMode('mobile')
    }
    prevKioskVisibleRef.current = kioskVisible
    prevSessionIdRef.current = currentSessionId
  }, [kioskVisible, session])

  // Shared URL for both iframes. Same impersonation_session_id means both
  // iframes ride the same backend session (one audit row pair, one TTL
  // clock). See Q1 in T-437f21f4 PR description for rationale. The pop-out
  // (T-427) reuses these exact URLs via impersonationPopoutUrl so a popped
  // window is byte-identical to inline — token + tenant identity in the hash
  // (not query string), IANA TZ carried so calendar-day math resolves to the
  // tenant's local boundary, not the admin viewer's browser TZ.
  const dashboardSrc = session ? impersonationPopoutUrl(IFRAME_TARGET_PATH, session) : ''
  const kioskSrc = session ? impersonationPopoutUrl(KIOSK_IFRAME_TARGET_PATH, session) : ''

  const activeDevice = DEVICES.find((d) => d.mode === deviceMode) ?? DEVICES[0]
  const iframeWidth = activeDevice.pixelWidth
    ? `${activeDevice.pixelWidth}px`
    : '100%'

  return (
    <section ref={panelRef} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
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
              {' · Dashboard '}
              {activeDevice.label} ({activeDevice.pixelLabel})
              {kioskVisible ? ' + Kiosk 768px' : ''}
            </span>
            {!kioskVisible ? (
              <button
                type="button"
                onClick={() => setKioskVisible(true)}
                className="rounded-md bg-white/15 px-2 py-1 text-xs font-bold hover:bg-white/25"
                data-testid="kiosk-pane-show"
              >
                Show Kiosk
              </button>
            ) : null}
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
        <div
          className={
            'mt-2 overflow-auto rounded-xl bg-black/5 p-3 ' +
            (stacked
              ? 'flex flex-col items-center gap-3'
              : 'flex flex-row justify-center gap-3')
          }
        >
          <div
            className="flex flex-col"
            style={{ width: iframeWidth, maxWidth: '100%', transition: 'width 120ms ease' }}
          >
            <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-black/10 bg-white/80 px-2 py-1">
              <span className="text-xs font-semibold text-brown">
                Dashboard · {activeDevice.label}
              </span>
              <button
                type="button"
                onClick={() => openPopout('dashboard', IFRAME_TARGET_PATH)}
                className="rounded p-1 text-brown hover:bg-black/5"
                aria-label="Open dashboard in a new window"
                title="Open in a new window"
                data-testid="popout-dashboard"
              >
                <PopoutIcon />
              </button>
            </div>
            <iframe
              ref={iframeRef}
              src={dashboardSrc}
              title={`View as ${session.tenant_name} - Dashboard`}
              className="rounded-b-lg border border-black/10 bg-white shadow-inner"
              style={{
                width: '100%',
                height: IFRAME_HEIGHT_CSS,
              }}
            />
          </div>
          {kioskVisible ? (
            <div className="flex flex-col">
              <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-black/10 bg-white/80 px-2 py-1">
                <span className="text-xs font-semibold text-brown">
                  Kiosk · 768px
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => openPopout('kiosk', KIOSK_IFRAME_TARGET_PATH)}
                    className="rounded p-1 text-brown hover:bg-black/5"
                    aria-label="Open kiosk in a new window"
                    title="Open in a new window"
                    data-testid="popout-kiosk"
                  >
                    <PopoutIcon />
                  </button>
                  <button
                    type="button"
                    onClick={() => setKioskVisible(false)}
                    className="rounded p-1 text-xs text-brown hover:bg-black/5"
                    aria-label="Hide kiosk pane"
                    data-testid="kiosk-pane-hide"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <iframe
                src={kioskSrc}
                title={`View as ${session.tenant_name} - Kiosk`}
                className="rounded-b-lg border border-black/10 bg-white shadow-inner"
                style={{
                  width: `${KIOSK_DEVICE_WIDTH_PX}px`,
                  maxWidth: '100%',
                  height: IFRAME_HEIGHT_CSS,
                }}
              />
            </div>
          ) : null}
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

// "Open in new window" glyph — a box with an arrow leaving its top-right
// corner. Inline SVG keeps the no-new-deps constraint; currentColor inherits
// the button's text color for hover states.
function PopoutIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  )
}
