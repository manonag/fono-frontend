'use client'

import { useSession } from 'next-auth/react'
import { useImpersonation } from '@/lib/impersonation'
import { useKioskSession } from '@/lib/kiosk-session'

/**
 * Returns the JWT to use for Authorization: Bearer on backend calls.
 *
 * Priority: a kiosk-by-token session (counter tablet, /kiosk?token=, see
 * lib/kiosk-session.tsx) wins; then the impersonation iframe token (URL hash,
 * see lib/impersonation.ts); then the next-auth session's fonoToken. The kiosk
 * and impersonation contexts default to "no token" outside their providers, so
 * non-kiosk pages fall straight through to the session. This is the single
 * switch point for kiosk / read-only-iframe credentials.
 */
export function useFonoToken(): string | undefined {
  const { data: session } = useSession()
  const imp = useImpersonation()
  const kiosk = useKioskSession()
  return kiosk.token ?? imp.token ?? session?.fonoToken
}
