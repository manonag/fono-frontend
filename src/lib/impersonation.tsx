'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

/**
 * T-228 View as Tenant: client-side impersonation state.
 *
 * The admin shell loads the tenant pages inside an iframe with URL:
 *   /dashboard?impersonation=1#impersonation_token=<jwt>&session_id=<uuid>
 *     &admin_email=<email>&tenant_id=<uuid>&tenant_name=<encoded>
 *
 * The token lives in the URL hash so it never reaches the server (no
 * referer leak, no Sentry/Vercel URL capture). ImpersonationProvider
 * reads the hash on first mount, holds the state, then scrubs the hash
 * via history.replaceState so the token does not persist in browser
 * history or get copied if the URL is shared. Because the state lives
 * in React context at root layout, it survives client-side navigation
 * within the iframe (dashboard -> analytics -> kiosk etc.).
 *
 * When readOnly is true:
 *   - useFonoToken returns the impersonation token (see use-fono-token.ts)
 *   - RestaurantProvider uses tenantId/tenantName as the active tenant
 *     (see restaurant-context.tsx)
 *   - ImpersonationBanner renders globally (see layout.tsx)
 *   - Settings and Kiosk pages disable their write buttons
 */

export interface ImpersonationState {
  readOnly: boolean
  adminEmail: string | null
  sessionId: string | null
  tenantId: string | null
  tenantName: string | null
  token: string | null
}

const EMPTY: ImpersonationState = {
  readOnly: false,
  adminEmail: null,
  sessionId: null,
  tenantId: null,
  tenantName: null,
  token: null,
}

const ImpersonationContext = createContext<ImpersonationState>(EMPTY)

function parseHash(hashValue: string): ImpersonationState {
  if (!hashValue || !hashValue.startsWith('#')) return EMPTY
  const params = new URLSearchParams(hashValue.substring(1))
  const token = params.get('impersonation_token')
  if (!token) return EMPTY
  const tenantNameRaw = params.get('tenant_name')
  return {
    readOnly: true,
    adminEmail: params.get('admin_email'),
    sessionId: params.get('session_id'),
    tenantId: params.get('tenant_id'),
    tenantName: tenantNameRaw ? decodeURIComponent(tenantNameRaw) : null,
    token,
  }
}

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [state] = useState<ImpersonationState>(() => {
    if (typeof window === 'undefined') return EMPTY
    return parseHash(window.location.hash)
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!state.token) return
    if (!window.location.hash) return
    // Scrub the hash so the token does not persist in browser history
    // or leak via URL copy. State stays in this provider's memory for
    // the lifetime of the iframe (survives client-side navigation).
    const cleanUrl = window.location.pathname + window.location.search
    window.history.replaceState(null, '', cleanUrl)
  }, [state.token])

  return (
    <ImpersonationContext.Provider value={state}>
      {children}
    </ImpersonationContext.Provider>
  )
}

export function useImpersonation(): ImpersonationState {
  return useContext(ImpersonationContext)
}
