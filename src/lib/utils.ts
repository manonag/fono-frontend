import { clsx, type ClassValue } from 'clsx'
import { formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { twMerge } from 'tailwind-merge'

const DEFAULT_TENANT_TIMEZONE = 'America/Los_Angeles'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}s`
  return `${mins}m ${secs}s`
}

/**
 * Format a call timestamp for display in a row.
 *
 * Returns three views of the same instant — `relative`, `absolute`, and a
 * pre-joined `combined` ("{relative} · {absolute}") — so callers can pick
 * whichever fits the surface.
 *
 * Rules (sprint 19f31b77):
 *  - "Just now" / "{n}m ago" — same calendar day in tenant TZ, joined with
 *    the wall-clock time. Example: `5m ago · 2:47 PM`
 *  - "{n}h ago" — same calendar day in tenant TZ, ≥1 h elapsed. Same join.
 *  - "Yesterday" — exactly one calendar day ago in tenant TZ. Joined with
 *    just the time. Example: `Yesterday · 7:40 PM`
 *  - "{n}d ago" — 2 to ~365 calendar days, still same year. Includes the
 *    date in the absolute portion. Example: `3d ago · Nov 11, 6:32 PM`
 *  - Prior year — drops the relative portion (it stops being useful once
 *    you'd have to read "327d ago"). Example: `Nov 14 2024, 2:47 PM`
 *
 * Calendar-day diff is done in tenant TZ, not by ms/86400000 — so a call
 * at 11 PM PT and a viewing at 1 AM PT the next day reads "Yesterday",
 * not "2h ago," and DST transitions don't bump the count.
 */
export interface FormattedCallTime {
  relative: string
  absolute: string
  combined: string
}

export function formatCallTime(
  iso: string,
  tenantTimezone: string | null | undefined,
): FormattedCallTime {
  const tz = tenantTimezone || DEFAULT_TENANT_TIMEZONE
  const callUtc = new Date(iso)
  const nowUtc = new Date()

  // Elapsed time for sub-day buckets uses real UTC ms — TZ-agnostic.
  const diffMs = nowUtc.getTime() - callUtc.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)

  // Calendar-day diff is the number of date-boundary crossings in the
  // tenant's TZ. toZonedTime gives us a Date whose getFullYear/Month/
  // Date reflect tenant-local wall clock; stripping time normalizes both
  // sides to midnight so the subtraction is integer days.
  const callLocal = toZonedTime(callUtc, tz)
  const nowLocal = toZonedTime(nowUtc, tz)
  const callDay = Date.UTC(
    callLocal.getFullYear(),
    callLocal.getMonth(),
    callLocal.getDate(),
  )
  const nowDay = Date.UTC(
    nowLocal.getFullYear(),
    nowLocal.getMonth(),
    nowLocal.getDate(),
  )
  const calDayDiff = Math.round((nowDay - callDay) / 86_400_000)
  const sameYear = callLocal.getFullYear() === nowLocal.getFullYear()

  const timeOnly = formatInTimeZone(callUtc, tz, 'h:mm a') // "2:47 PM"
  const datePart = sameYear
    ? formatInTimeZone(callUtc, tz, 'MMM d') // "Nov 11"
    : formatInTimeZone(callUtc, tz, 'MMM d yyyy') // "Nov 14 2024"
  const absoluteFull = `${datePart}, ${timeOnly}`

  // Future-dated rows (clock skew, mocked data) fall through to "Just now"
  // rather than "-Nm ago"; same-day path covers them implicitly.
  if (calDayDiff <= 0 && diffMins < 1) {
    return { relative: 'Just now', absolute: timeOnly, combined: `Just now · ${timeOnly}` }
  }
  if (calDayDiff <= 0 && diffMins < 60) {
    const rel = `${diffMins}m ago`
    return { relative: rel, absolute: timeOnly, combined: `${rel} · ${timeOnly}` }
  }
  if (calDayDiff === 0) {
    const rel = `${diffHours}h ago`
    return { relative: rel, absolute: timeOnly, combined: `${rel} · ${timeOnly}` }
  }
  if (calDayDiff === 1) {
    return { relative: 'Yesterday', absolute: timeOnly, combined: `Yesterday · ${timeOnly}` }
  }
  if (sameYear) {
    const rel = `${calDayDiff}d ago`
    return { relative: rel, absolute: absoluteFull, combined: `${rel} · ${absoluteFull}` }
  }
  // Prior-year fall-through: relative gets dropped — beyond a year ago
  // "{n}d ago" is harder to parse than the explicit date.
  return { relative: '', absolute: absoluteFull, combined: absoluteFull }
}
