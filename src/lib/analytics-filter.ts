import { addDays, startOfMonth } from 'date-fns'
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz'

import type { DateFilter } from '@/types'

/**
 * Date-window resolution for the dashboard / analytics filter pills.
 *
 * All math is in the tenant's IANA timezone — Today/Yesterday/Week/Month/
 * Custom resolve to the tenant's calendar day, not the viewer's browser TZ.
 * The returned `startDate` / `endDate` are JS Date objects representing UTC
 * INSTANTS; callers should send `.toISOString()` directly to the backend as
 * `date_from` / `date_to`.
 *
 * DST-safe because we never add `timedelta(days=1)` to a UTC instant. Each
 * calendar-day boundary is computed independently by `fromZonedTime`, so
 * spring-forward days yield a 23-h UTC window and fall-back days 25-h.
 *
 * The previous implementation used `new Date(y, m, d)` (browser TZ) and the
 * `timezone` parameter was wired only to label formatting, never to the
 * window math itself. That was the source of the Yesterday=Today bug —
 * sprint c630d5f1.
 */

const DEFAULT_TIMEZONE = 'America/Los_Angeles'

export interface CustomDateRange {
  from: string
  to: string
}

export interface ResolvedWindow {
  /** UTC instant marking the inclusive start of the window. */
  startDate: Date
  /** UTC instant marking the exclusive end of the window. */
  endDate: Date
  /** Display label like "Today (May 14, 2026)". Always in tenant TZ. */
  label: string
  /** Short label like "Today" or "May 14". Always in tenant TZ. */
  shortLabel: string
  /** One Date per calendar day in the window (tenant-local midnight, UTC). */
  daysInRange: Date[]
}

/** Tenant-local midnight for the supplied date, as a UTC instant. */
function localMidnightUtc(year: number, month1to12: number, day: number, tz: string): Date {
  // date-fns-tz fromZonedTime treats the wall-clock string as already-local
  // to `tz` and returns the corresponding UTC instant. Building the input
  // string explicitly avoids any browser-TZ contamination.
  const pad = (n: number) => String(n).padStart(2, '0')
  const wallClock = `${year}-${pad(month1to12)}-${pad(day)}T00:00:00`
  return fromZonedTime(wallClock, tz)
}

/** Today's date (year/month/day) in the tenant's TZ. */
function todayInTz(tz: string): { year: number; month: number; day: number } {
  const now = new Date()
  // toZonedTime returns a Date whose UTC fields ARE the tenant-local wall
  // clock fields — quirky but documented behavior of date-fns-tz.
  const local = toZonedTime(now, tz)
  return {
    year: local.getFullYear(),
    month: local.getMonth() + 1,
    day: local.getDate(),
  }
}

/** Build one date-anchor per calendar day in [startLocal, endLocal). */
function buildDayArray(
  startUtc: Date,
  endUtc: Date,
  tz: string,
): Date[] {
  const out: Date[] = []
  let cursor = startUtc
  // 100 is enough for any realistic UI range (custom Jan 1 → Dec 31 = 365);
  // cap to keep a buggy date range from infinite-looping.
  for (let i = 0; i < 400 && cursor < endUtc; i++) {
    out.push(cursor)
    // Advance one calendar day in tenant TZ rather than adding 86_400_000
    // ms — DST days are not 24 h long. addDays on the toZonedTime view
    // gives us the next calendar day at midnight tenant-local.
    const local = toZonedTime(cursor, tz)
    const nextLocal = addDays(local, 1)
    cursor = fromZonedTime(
      `${nextLocal.getFullYear()}-${String(nextLocal.getMonth() + 1).padStart(2, '0')}-${String(nextLocal.getDate()).padStart(2, '0')}T00:00:00`,
      tz,
    )
  }
  return out
}

function formatLongDay(utc: Date, tz: string): string {
  return formatInTimeZone(utc, tz, 'MMM d, yyyy')
}

function formatShortDay(utc: Date, tz: string): string {
  return formatInTimeZone(utc, tz, 'MMM d')
}

export function resolveFilterWindow(
  filter: DateFilter,
  customRange: CustomDateRange | undefined,
  timezone: string = DEFAULT_TIMEZONE,
): ResolvedWindow {
  const today = todayInTz(timezone)
  const todayStartUtc = localMidnightUtc(today.year, today.month, today.day, timezone)
  const now = new Date()

  let startDate: Date
  let endDate: Date
  let chipLabel: string

  switch (filter) {
    case 'today':
      startDate = todayStartUtc
      endDate = now
      chipLabel = 'Today'
      break
    case 'yesterday': {
      // Yesterday is the calendar day before today *in the tenant TZ*. We
      // walk via the zoned view so DST boundaries collapse correctly.
      const yest = addDays(toZonedTime(todayStartUtc, timezone), -1)
      startDate = localMidnightUtc(
        yest.getFullYear(),
        yest.getMonth() + 1,
        yest.getDate(),
        timezone,
      )
      // End is exclusive — exactly today's midnight (tenant-local).
      endDate = todayStartUtc
      chipLabel = 'Yesterday'
      break
    }
    case 'week': {
      // Monday-to-now of the current ISO-ish week (Sun rolls to prior Mon).
      const localToday = toZonedTime(todayStartUtc, timezone)
      const dow = localToday.getDay() // 0=Sun..6=Sat
      const mondayOffset = dow === 0 ? 6 : dow - 1
      const monday = addDays(localToday, -mondayOffset)
      startDate = localMidnightUtc(
        monday.getFullYear(),
        monday.getMonth() + 1,
        monday.getDate(),
        timezone,
      )
      endDate = now
      chipLabel = 'This Week'
      break
    }
    case 'month': {
      const localToday = toZonedTime(todayStartUtc, timezone)
      const firstOfMonth = startOfMonth(localToday)
      startDate = localMidnightUtc(
        firstOfMonth.getFullYear(),
        firstOfMonth.getMonth() + 1,
        firstOfMonth.getDate(),
        timezone,
      )
      endDate = now
      chipLabel = 'This Month'
      break
    }
    case 'custom': {
      if (customRange) {
        // The picker emits YYYY-MM-DD wall-clock strings (HTML <input
        // type="date"> semantics). Interpret both ends in tenant TZ.
        const [fy, fm, fd] = customRange.from.split('-').map(n => parseInt(n, 10))
        const [ty, tm, td] = customRange.to.split('-').map(n => parseInt(n, 10))
        startDate = localMidnightUtc(fy, fm, fd, timezone)
        // Exclusive end is the next day's midnight, so the picker's "to=May
        // 14" includes all of May 14 in tenant TZ.
        const toLocal = addDays(new Date(ty, tm - 1, td), 1)
        endDate = localMidnightUtc(
          toLocal.getFullYear(),
          toLocal.getMonth() + 1,
          toLocal.getDate(),
          timezone,
        )
      } else {
        startDate = todayStartUtc
        endDate = now
      }
      chipLabel = 'Custom'
      break
    }
    default:
      startDate = todayStartUtc
      endDate = now
      chipLabel = 'Today'
  }

  const daysInRange = buildDayArray(startDate, endDate, timezone)
  const sameDay = daysInRange.length <= 1

  let rangeLong: string
  if (sameDay) {
    rangeLong = formatLongDay(startDate, timezone)
  } else {
    const startYear = parseInt(formatInTimeZone(startDate, timezone, 'yyyy'), 10)
    const lastDay = daysInRange[daysInRange.length - 1]
    const endYear = parseInt(formatInTimeZone(lastDay, timezone, 'yyyy'), 10)
    const endLong = formatLongDay(lastDay, timezone)
    if (startYear === endYear) {
      const startNoYear = formatShortDay(startDate, timezone)
      rangeLong = `${startNoYear} – ${endLong}`
    } else {
      rangeLong = `${formatLongDay(startDate, timezone)} – ${endLong}`
    }
  }

  const label = `${chipLabel} (${rangeLong})`

  let shortLabel: string
  if (filter === 'today') {
    shortLabel = 'Today'
  } else if (filter === 'yesterday') {
    shortLabel = 'Yesterday'
  } else if (sameDay) {
    shortLabel = formatShortDay(startDate, timezone)
  } else {
    const lastDay = daysInRange[daysInRange.length - 1]
    shortLabel = `${formatShortDay(startDate, timezone)} – ${formatShortDay(lastDay, timezone)}`
  }

  return { startDate, endDate, label, shortLabel, daysInRange }
}
