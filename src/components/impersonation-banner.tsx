'use client'

import { useImpersonation } from '@/lib/impersonation'

/**
 * T-228 View as Tenant: sticky red banner shown inside the impersonation
 * iframe. Self-renders nothing when not in impersonation mode, so it is
 * safe to mount globally in the root layout.
 *
 * Outer admin chrome ("Impersonating: <tenant>") is a separate component
 * in the admin shell; this banner is what the iframe content shows.
 */
export function ImpersonationBanner() {
  const imp = useImpersonation()
  if (!imp.readOnly) return null
  const who = imp.adminEmail ?? 'admin'
  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-red-600 px-4 py-2 text-center text-sm font-medium text-white shadow"
      data-testid="impersonation-banner"
    >
      Read-only preview - impersonated by {who}
    </div>
  )
}
