'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useSearchParams } from 'next/navigation'
import { config } from '@/lib/config'
import { toTenant } from '@/lib/tenant-config'
import type { Tenant } from '@/components/kiosk/voicemail/types'

/**
 * T-304 slice (e) frontend consumer: kiosk-by-token bootstrap.
 *
 * A counter tablet opens /kiosk?token=<kiosk_token> (the durable per-tenant
 * bookmark). This provider exchanges that token at GET /kiosk/by-token/{token}
 * for a 1-hour writable scope='kiosk' session JWT + the tenant config, and
 * re-exchanges shortly before expiry so the tablet can stay open indefinitely.
 *
 * The session JWT (not the kiosk_token) is what useFonoToken hands to the kiosk
 * calls; scope='kiosk' is writable for exactly the voicemail status/intent/
 * callback endpoints (_require_writable allow_kiosk=True). The kiosk_token stays
 * in the URL so the bookmark survives reload — it is never logged, forwarded to
 * analytics, or echoed anywhere beyond the by-token request URL itself.
 */

export type KioskSessionStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface KioskSession {
  active: boolean // a ?token= kiosk_token was present in the URL
  status: KioskSessionStatus
  token: string | null // the 1-hour writable scope='kiosk' session JWT
  tenant: Tenant | null // tenant config from the by-token response
  error: string | null
}

const IDLE: KioskSession = {
  active: false,
  status: 'idle',
  token: null,
  tenant: null,
  error: null,
}

const KioskSessionContext = createContext<KioskSession>(IDLE)

interface ByTokenResponse {
  token?: string
  expires_at?: string
  tenant?: unknown
}

export function KioskSessionProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  const kioskToken = searchParams.get('token')
  const [state, setState] = useState<KioskSession>(IDLE)
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!kioskToken) {
      setState(IDLE)
      return
    }
    let cancelled = false

    async function exchange() {
      // Keep showing the kiosk during a refresh (token already present) rather
      // than flashing the loading screen.
      setState((s) => ({
        ...s,
        active: true,
        status: s.token ? 'ready' : 'loading',
        error: null,
      }))
      try {
        const res = await fetch(
          `${config.apiUrl}/api/v1/kiosk/by-token/${encodeURIComponent(kioskToken as string)}`,
        )
        if (cancelled) return
        if (!res.ok) {
          setState({
            active: true,
            status: 'error',
            token: null,
            tenant: null,
            error:
              res.status === 404
                ? 'This kiosk link is invalid or has been replaced. Ask your manager for a fresh link.'
                : 'Could not start the kiosk. Please try again in a moment.',
          })
          return
        }
        const data = (await res.json()) as ByTokenResponse
        if (cancelled) return
        const tenant = toTenant(data.tenant)
        if (!data.token || !tenant) {
          setState({
            active: true,
            status: 'error',
            token: null,
            tenant: null,
            error: 'The kiosk could not be loaded. Please try again.',
          })
          return
        }
        setState({ active: true, status: 'ready', token: data.token, tenant, error: null })

        // Re-exchange ~60s before the 1-hour JWT expires (min 15s).
        if (refreshTimer.current) clearTimeout(refreshTimer.current)
        const expiresAt = data.expires_at ? Date.parse(data.expires_at) : NaN
        if (!Number.isNaN(expiresAt)) {
          const delay = Math.max(15_000, expiresAt - Date.now() - 60_000)
          refreshTimer.current = setTimeout(() => {
            void exchange()
          }, delay)
        }
      } catch {
        if (cancelled) return
        setState({
          active: true,
          status: 'error',
          token: null,
          tenant: null,
          error: 'Could not reach the server. Check the connection and reload.',
        })
      }
    }

    void exchange()
    return () => {
      cancelled = true
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
    }
  }, [kioskToken])

  return (
    <KioskSessionContext.Provider value={state}>
      {children}
    </KioskSessionContext.Provider>
  )
}

export function useKioskSession(): KioskSession {
  return useContext(KioskSessionContext)
}
