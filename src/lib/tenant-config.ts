import type { Tenant } from '@/components/kiosk/voicemail/types'

/**
 * Map a raw tenant kiosk-config payload (GET /tenants/{id} or the by-token
 * response's `tenant`) onto the FE Tenant.
 *
 * The load-bearing bit (the PR #28 lesson): sla_enabled DEFAULTS TRUE when the
 * field is absent or anything other than an explicit false, so a missing value
 * can never flip a tenant into the SLA-off voicemail-led kiosk. Returns null
 * for a malformed payload so callers can degrade rather than render a mock.
 */
export function toTenant(raw: unknown): Tenant | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !Array.isArray(r.categories)) return null
  return { ...(r as object), sla_enabled: r.sla_enabled !== false } as Tenant
}
