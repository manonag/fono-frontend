'use client'

import { useSession } from 'next-auth/react'
import { useImpersonation } from '@/lib/impersonation'

/**
 * Returns the JWT to use for Authorization: Bearer on backend calls.
 *
 * When the page is loaded as an impersonation iframe (URL hash carries
 * a token, see lib/impersonation.ts), the impersonation token wins.
 * Otherwise the next-auth session's fonoToken is returned. This is the
 * single switch point for read-only iframe mode; every page that calls
 * useFonoToken automatically uses the right credential.
 */
export function useFonoToken(): string | undefined {
  const { data: session } = useSession()
  const imp = useImpersonation()
  return imp.token ?? session?.fonoToken
}
