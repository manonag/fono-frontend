import { describe, expect, it } from 'vitest'

import {
  POPOUT_TOKEN_REFRESH_THRESHOLD_MS,
  impersonationHashParams,
  impersonationPopoutUrl,
  popoutWindowName,
  shouldRefreshToken,
  type ImpersonationSessionLike,
} from '@/lib/impersonation-popout'

const SESS: ImpersonationSessionLike = {
  token: 'jwt.abc.def',
  session_id: '11111111-1111-1111-1111-111111111111',
  admin_email: 'admin@fono.services',
  tenant_id: '5c59ba59-2bf0-40a4-b15a-2d96c509ef29',
  tenant_name: 'Spice Garden',
  tenant_timezone: 'America/Los_Angeles',
  expires_at: '2026-07-05T12:15:00.000Z',
}

describe('impersonationHashParams', () => {
  it('carries token, session, admin, tenant id/name/tz in the hash', () => {
    const params = new URLSearchParams(impersonationHashParams(SESS))
    expect(params.get('impersonation_token')).toBe('jwt.abc.def')
    expect(params.get('session_id')).toBe(SESS.session_id)
    expect(params.get('admin_email')).toBe('admin@fono.services')
    expect(params.get('tenant_id')).toBe(SESS.tenant_id)
    expect(params.get('tenant_timezone')).toBe('America/Los_Angeles')
  })

  it('double-encodes tenant_name so parseHash can decodeURIComponent it back', () => {
    const spaced: ImpersonationSessionLike = { ...SESS, tenant_name: 'Curry & Co' }
    const params = new URLSearchParams(impersonationHashParams(spaced))
    // URLSearchParams decodes one layer; the app-level decodeURIComponent
    // in lib/impersonation.tsx removes the second layer we add here.
    const oneLayer = params.get('tenant_name')
    expect(oneLayer).toBe(encodeURIComponent('Curry & Co'))
    expect(decodeURIComponent(oneLayer as string)).toBe('Curry & Co')
  })
})

describe('impersonationPopoutUrl', () => {
  it('builds {path}?impersonation=1#{hash} with the hash transport', () => {
    const url = impersonationPopoutUrl('/dashboard', SESS)
    expect(url.startsWith('/dashboard?impersonation=1#')).toBe(true)
    // Token lives in the hash, never the query string.
    expect(url.split('#')[0]).toBe('/dashboard?impersonation=1')
    expect(url.split('#')[0]).not.toContain('impersonation_token')
    expect(url).toContain('impersonation_token=jwt.abc.def')
  })

  it('is identical for the URL the iframe would use for the same path', () => {
    // Guards the "window.open(sameUrlTheIframeUses)" contract.
    expect(impersonationPopoutUrl('/kiosk', SESS)).toBe(
      `/kiosk?impersonation=1#${impersonationHashParams(SESS)}`,
    )
  })
})

describe('popoutWindowName', () => {
  it('is stable per view + tenant so repeat clicks focus not duplicate', () => {
    expect(popoutWindowName('dashboard', 't-1')).toBe('fono-popout-dashboard-t-1')
    expect(popoutWindowName('kiosk', 't-1')).toBe('fono-popout-kiosk-t-1')
    // Different views and tenants get distinct windows.
    expect(popoutWindowName('dashboard', 't-1')).not.toBe(popoutWindowName('kiosk', 't-1'))
    expect(popoutWindowName('dashboard', 't-1')).not.toBe(popoutWindowName('dashboard', 't-2'))
  })
})

describe('shouldRefreshToken', () => {
  const expiresMs = new Date(SESS.expires_at).getTime()

  it('refreshes when within the 2 min threshold of expiry', () => {
    const now = expiresMs - 60 * 1000 // 1 min left
    expect(shouldRefreshToken(SESS.expires_at, now)).toBe(true)
  })

  it('does not refresh with plenty of life left', () => {
    const now = expiresMs - 10 * 60 * 1000 // 10 min left
    expect(shouldRefreshToken(SESS.expires_at, now)).toBe(false)
  })

  it('refreshes exactly at the threshold boundary', () => {
    const now = expiresMs - POPOUT_TOKEN_REFRESH_THRESHOLD_MS
    expect(shouldRefreshToken(SESS.expires_at, now)).toBe(true)
  })

  it('treats an already-expired token as needing refresh', () => {
    expect(shouldRefreshToken(SESS.expires_at, expiresMs + 1000)).toBe(true)
  })

  it('does not block the open on an unparseable timestamp', () => {
    expect(shouldRefreshToken('not-a-date', expiresMs)).toBe(false)
  })
})
