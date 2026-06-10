// Shared kiosk call ordering helpers, used by both the standalone SLA kiosk
// (KioskContent) and the coexistence kiosk's live surface (CoexistKiosk).
// Extracted verbatim from the original kiosk/page.tsx so both surfaces dedupe
// and prioritize missed calls identically.

import type { KioskCall } from './call-card'

function getSLARemaining(call: KioskCall): number {
  if (!call.sla_deadline) return Infinity
  return new Date(call.sla_deadline).getTime() - Date.now()
}

export function sortMissedCalls(calls: KioskCall[]): KioskCall[] {
  return [...calls].sort((a, b) => {
    const aNowBreached = a.sla_breached || (a.sla_deadline ? new Date(a.sla_deadline).getTime() < Date.now() : false)
    const bNowBreached = b.sla_breached || (b.sla_deadline ? new Date(b.sla_deadline).getTime() < Date.now() : false)

    // Breached always on top
    if (aNowBreached && !bNowBreached) return -1
    if (!aNowBreached && bNowBreached) return 1

    // Among breached: most overdue first
    if (aNowBreached && bNowBreached) {
      return new Date(a.sla_deadline!).getTime() - new Date(b.sla_deadline!).getTime()
    }

    // Among non-breached: least SLA remaining first with repeat caller boost
    const aRemaining = getSLARemaining(a) / (a.repeat_count > 1 ? a.repeat_count * 0.5 : 1)
    const bRemaining = getSLARemaining(b) / (b.repeat_count > 1 ? b.repeat_count * 0.5 : 1)

    if (aRemaining !== bRemaining) return aRemaining - bRemaining

    // Tiebreaker: most recent first
    return new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
  })
}

/** Group calls by caller_phone. Returns one card per unique number using the oldest call's data. */
export function deduplicateByCaller(calls: KioskCall[]): KioskCall[] {
  const grouped = new Map<string, KioskCall[]>()

  for (const call of calls) {
    const key = call.caller_phone
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(call)
  }

  return Array.from(grouped.values()).map((group) => {
    // Sort ascending by started_at — oldest first (most urgent SLA)
    group.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    return group[0]
  })
}
