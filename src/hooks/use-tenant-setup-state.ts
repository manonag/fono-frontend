'use client'

import { useEffect, useState } from 'react'
import { useFonoToken } from './use-fono-token'
import { useRestaurant } from '@/lib/restaurant-context'
import { config } from '@/lib/config'

// v3.3 setup state derived from the tenant settings response. `variant`
// drives <SetupBanner>'s three copy variants (CD hand-off §1.1) and the
// sidebar attention dot (CD §5.3). `verified === true` short-circuits both
// surfaces: a verified tenant has no banner and no dot.
export type SetupVariant = 'no-path' | 'picked-live' | 'picked-voicemail'

export type TenantSetupState = {
  // null until the first fetch resolves so callers can distinguish
  // "still loading" from "loaded but everything is verified".
  loaded: boolean
  variant: SetupVariant | null
  verified: boolean
}

const INITIAL: TenantSetupState = {
  loaded: false,
  variant: null,
  verified: false,
}

function deriveVariant(callSetupPath: string | null | undefined): SetupVariant {
  if (callSetupPath === 'live') return 'picked-live'
  if (callSetupPath === 'voicemail') return 'picked-voicemail'
  return 'no-path'
}

// Fetches /api/v1/tenants/{tenantId}/settings and returns the slice the
// banner + sidebar dot need. Re-fetches whenever the active tenant or the
// auth token changes; no client-side caching beyond a single in-flight
// request guard so a user verifying in another tab sees the banner
// disappear on the next navigation (per CD §1.1).
export function useTenantSetupState(): TenantSetupState {
  const { current, isAll, restaurants } = useRestaurant()
  const token = useFonoToken()
  const [state, setState] = useState<TenantSetupState>(INITIAL)

  const tenantId = isAll ? restaurants[0]?.id : current.id

  useEffect(() => {
    if (!tenantId || !token) return
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/tenants/${tenantId}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { call_setup_path?: string | null; call_forwarding_verified?: boolean } | null) => {
        if (cancelled || !data) return
        setState({
          loaded: true,
          variant: deriveVariant(data.call_setup_path),
          verified: data.call_forwarding_verified === true,
        })
      })
      .catch(() => {
        // Silent: a failed fetch leaves state at the initial loaded=false
        // value, which yields no banner. The user will retry on next nav.
      })
    return () => {
      cancelled = true
    }
  }, [tenantId, token])

  return state
}
