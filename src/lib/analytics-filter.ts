import type { DateFilter } from '@/types'

export interface CustomDateRange {
  from: string
  to: string
}

export interface ResolvedWindow {
  startDate: Date
  endDate: Date
  label: string
  shortLabel: string
  daysInRange: Date[]
}

const MS_PER_DAY = 86_400_000
const DEFAULT_TIMEZONE = 'America/Los_Angeles'

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function buildDayArray(start: Date, end: Date): Date[] {
  const out: Date[] = []
  const last = startOfDay(end)
  const cursor = startOfDay(start)
  while (cursor.getTime() <= last.getTime()) {
    out.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return out
}

function formatLongDay(d: Date, tz: string): string {
  return d.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric', year: 'numeric' })
}

function formatShortDay(d: Date, tz: string): string {
  return d.toLocaleDateString('en-US', { timeZone: tz, month: 'short', day: 'numeric' })
}

export function resolveFilterWindow(
  filter: DateFilter,
  customRange: CustomDateRange | undefined,
  timezone: string = DEFAULT_TIMEZONE
): ResolvedWindow {
  const now = new Date()
  const today = startOfDay(now)

  let startDate: Date
  let endDate: Date
  let chipLabel: string

  switch (filter) {
    case 'today':
      startDate = today
      endDate = now
      chipLabel = 'Today'
      break
    case 'yesterday': {
      startDate = new Date(today.getTime() - MS_PER_DAY)
      endDate = new Date(today.getTime() - 1)
      chipLabel = 'Yesterday'
      break
    }
    case 'week': {
      const dow = today.getDay()
      const mondayOffset = dow === 0 ? 6 : dow - 1
      startDate = new Date(today.getTime() - mondayOffset * MS_PER_DAY)
      endDate = now
      chipLabel = 'This Week'
      break
    }
    case 'month': {
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = now
      chipLabel = 'This Month'
      break
    }
    case 'custom': {
      if (customRange) {
        const from = new Date(customRange.from)
        const to = new Date(customRange.to)
        to.setHours(23, 59, 59, 999)
        startDate = from
        endDate = to
      } else {
        startDate = today
        endDate = now
      }
      chipLabel = 'Custom'
      break
    }
    default:
      startDate = today
      endDate = now
      chipLabel = 'Today'
  }

  const daysInRange = buildDayArray(startDate, endDate)
  const sameDay = daysInRange.length <= 1

  let rangeLong: string
  if (sameDay) {
    rangeLong = formatLongDay(startDate, timezone)
  } else {
    const startYear = daysInRange[0].getFullYear()
    const endYear = daysInRange[daysInRange.length - 1].getFullYear()
    const endLong = formatLongDay(endDate, timezone)
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
    shortLabel = `${formatShortDay(startDate, timezone)} – ${formatShortDay(endDate, timezone)}`
  }

  return { startDate, endDate, label, shortLabel, daysInRange }
}
