// TEMPORARY: hardcoded for single-tenant pilot (Thecha).
// Replace with per-tenant business_hours from Google Places integration.
// See CHIRAN sprint items:
//   - Sprint A (backend foundation, place_id + business_hours schema):
//       d79efa70-9a0e-4353-8696-1e5becaf6a12
//   - Sprint B (settings UI display + manual sync, blocked on A):
//       0f8d0118-039f-42d0-861a-ef3753cd2313
//   - Sprint C (signup flow wires place_id end-to-end, blocked on A):
//       3cef7bcd-8b4c-4959-9074-1059e058e72e
//   - Sprint D (deletes this file once A ships, swaps in per-tenant fetch):
//       7a5d367b-4f69-4aaf-a7a4-28cf78b30f81
//   - Sprint E (cron + heatmap tenant-TZ correction):
//       c11502d8-c370-4119-97ce-b0d5de24763c
// Owner: Mano. Do not extend this file - extend the platform sprint instead.

export type BusinessHours = {
  /** Opening hour, 0..23 (tenant-local wall clock). */
  open_hour: number
  /** Closing hour, 1..24. 24 means "midnight at end of day". */
  close_hour: number
}

/**
 * Thecha is open 10:00 to 22:00 every day. Matches the hardcoded value
 * in fono-backend scripts/cron/end_of_day_auto_ignore.py for the same
 * tenant; both will be replaced when the Business Hours Platform sprints
 * (A/B/C) ship a real per-tenant column populated from Google Places.
 */
export const HARDCODED_BUSINESS_HOURS: BusinessHours = {
  open_hour: 10,
  close_hour: 22,
}

/**
 * Returns true when `hour` (0..23) falls inside the open window.
 *
 * Handles both same-day windows (close_hour > open_hour, e.g. 10..22) and
 * overnight windows that cross midnight (close_hour <= open_hour, e.g.
 * 18..2 meaning open from 18:00 until 02:00 next morning). Thecha does
 * not need the overnight case today, but we handle it so the helper can
 * outlive the pilot without behavioral surprises.
 */
export function isWorkingHour(hour: number, bh: BusinessHours): boolean {
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return false
  const open = bh.open_hour
  const close = bh.close_hour
  if (close > open) {
    // Same-day window: [open, close)
    return hour >= open && hour < close
  }
  // Overnight window: [open, 24) ∪ [0, close)
  return hour >= open || hour < close
}

export type WorkingHourBucket = { hour: number; count: number }
export type BucketedHours = {
  workingHours: WorkingHourBucket[]
  closedCount: number
}

/**
 * Splits a 24-element call-count-by-hour array into per-hour working-hour
 * buckets plus a single closed-hour sum. Working hours preserve their
 * wall-clock hour for label rendering.
 *
 * For same-day windows the working hours come out in ascending order
 * starting at open_hour. For overnight windows they are re-ordered to
 * start at open_hour and wrap through midnight, so a chart reading the
 * array left-to-right traces the open window naturally.
 *
 * If `callsByHour` has fewer than 24 entries, missing slots count as 0.
 */
export function bucketHours(callsByHour: number[], bh: BusinessHours): BucketedHours {
  const workingHours: WorkingHourBucket[] = []
  let closedCount = 0
  for (let hour = 0; hour < 24; hour++) {
    const count = Number.isFinite(callsByHour[hour]) ? (callsByHour[hour] as number) : 0
    if (isWorkingHour(hour, bh)) {
      workingHours.push({ hour, count })
    } else {
      closedCount += count
    }
  }
  // Same-day windows: the natural 0..23 walk already yields the open
  // window in the right order. Overnight windows: rotate so the first
  // entry is open_hour.
  if (bh.close_hour <= bh.open_hour) {
    const pivot = workingHours.findIndex(w => w.hour === bh.open_hour)
    if (pivot > 0) {
      return {
        workingHours: [...workingHours.slice(pivot), ...workingHours.slice(0, pivot)],
        closedCount,
      }
    }
  }
  return { workingHours, closedCount }
}
