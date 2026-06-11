import { describe, expect, it } from 'vitest'

import { toTenant } from '@/lib/tenant-config'

// The by-token response carries the tenant kiosk config; toTenant maps it onto
// the FE Tenant. The load-bearing bit (the PR #28 lesson): sla_enabled DEFAULTS
// TRUE when absent, so a missing field can never flip a tenant into the
// SLA-off voicemail-led kiosk.
const base = {
  id: 't1',
  name: 'Thecha',
  location: 'Sunnyvale, CA',
  call_setup_path: 'live',
  routing_mode: 'sla',
  voicemail_enabled: true,
  categories: [],
}

describe('toTenant', () => {
  it('defaults sla_enabled to true when the field is absent', () => {
    const t = toTenant({ ...base })
    expect(t?.sla_enabled).toBe(true)
  })

  it('preserves an explicit sla_enabled=false', () => {
    const t = toTenant({ ...base, sla_enabled: false })
    expect(t?.sla_enabled).toBe(false)
  })

  it('preserves an explicit sla_enabled=true', () => {
    const t = toTenant({ ...base, sla_enabled: true })
    expect(t?.sla_enabled).toBe(true)
  })

  it('treats any non-false value as true (never undefined)', () => {
    const t = toTenant({ ...base, sla_enabled: null })
    expect(t?.sla_enabled).toBe(true)
  })

  it('returns null for a malformed payload (missing id / categories)', () => {
    expect(toTenant(null)).toBeNull()
    expect(toTenant({})).toBeNull()
    expect(toTenant({ id: 't1' })).toBeNull()
    expect(toTenant({ id: 't1', categories: 'nope' })).toBeNull()
  })

  it('carries the rest of the config through unchanged', () => {
    const t = toTenant({ ...base, sla_enabled: false })
    expect(t?.id).toBe('t1')
    expect(t?.call_setup_path).toBe('live')
    expect(t?.voicemail_enabled).toBe(true)
  })
})
