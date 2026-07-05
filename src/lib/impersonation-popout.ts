/**
 * T-427 View as Tenant pop-out: pure helpers for opening the inline
 * dashboard / kiosk iframes in their own browser window.
 *
 * The popped window is a fresh, same-origin document that loads the exact
 * same URL the iframe uses: `{path}?impersonation=1#{hash}`. The token and
 * tenant identity ride the URL hash (never the query string) so they stay
 * out of server logs, referer headers, and browser history — the same
 * transport decision the inline iframe made (see lib/impersonation.tsx and
 * components/admin/ViewAsTenantPanel.tsx). On load the popped window's
 * ImpersonationProvider parses the hash, holds the state, then scrubs the
 * hash via history.replaceState — identical to inline.
 *
 * These are the pure, DOM-free pieces so the URL/name/TTL contract can be
 * unit tested without a browser. The imperative window.open / focus / close
 * lives in ViewAsTenantPanel.
 */

export type PopoutView = 'dashboard' | 'kiosk'

/** Minimal shape the pop-out helpers need from an impersonation session. */
export interface ImpersonationSessionLike {
  token: string
  session_id: string
  admin_email: string
  tenant_id: string
  tenant_name: string
  tenant_timezone: string
  expires_at: string
}

/**
 * If the current token is within this window of expiry at click time, mint a
 * fresh one before opening so the popped window inherits a full-life token
 * rather than one that dies moments later.
 */
export const POPOUT_TOKEN_REFRESH_THRESHOLD_MS = 2 * 60 * 1000

/**
 * URL hash carrying the impersonation token + tenant identity. Byte-identical
 * to the string ViewAsTenantPanel builds for the iframe `src`, so the popped
 * window resolves the same tenant, TZ, and read-only state as inline.
 *
 * tenant_name is encodeURIComponent'd before URLSearchParams (which encodes
 * again); parseHash in lib/impersonation.tsx decodeURIComponent's the value
 * URLSearchParams already decoded once. The double round-trip is intentional
 * and must be preserved on both sides.
 */
export function impersonationHashParams(sess: ImpersonationSessionLike): string {
  return new URLSearchParams({
    impersonation_token: sess.token,
    session_id: sess.session_id,
    admin_email: sess.admin_email,
    tenant_id: sess.tenant_id,
    tenant_name: encodeURIComponent(sess.tenant_name),
    tenant_timezone: sess.tenant_timezone,
  }).toString()
}

/** The full same-origin URL the iframe and the pop-out both load. */
export function impersonationPopoutUrl(
  path: string,
  sess: ImpersonationSessionLike,
): string {
  return `${path}?impersonation=1#${impersonationHashParams(sess)}`
}

/**
 * Stable per-(view, tenant) window name. Reusing the name means a repeat
 * click targets the same OS window (focus, not duplicate) instead of
 * spawning a second one.
 */
export function popoutWindowName(view: PopoutView, tenantId: string): string {
  return `fono-popout-${view}-${tenantId}`
}

/**
 * True when the token should be re-minted before opening. Guards against an
 * unparseable timestamp by returning false — better to open with the current
 * token than to block the click on a bad date.
 */
export function shouldRefreshToken(
  expiresAtIso: string,
  nowMs: number,
  thresholdMs: number = POPOUT_TOKEN_REFRESH_THRESHOLD_MS,
): boolean {
  const expiresMs = new Date(expiresAtIso).getTime()
  if (Number.isNaN(expiresMs)) return false
  return expiresMs - nowMs <= thresholdMs
}
