import type { QueueItem } from './types'

// C3S2 Part 2 pagination. Append a freshly-fetched page to the loaded list,
// dropping any item whose recording_id is already present. Offset-based paging
// can overlap if the underlying data shifts between page loads (a row is
// claimed/released, changing ordering), so this guards against duplicate
// appends while preserving load order.
export function appendUniqueQueueItems(
  existing: QueueItem[],
  incoming: QueueItem[],
): QueueItem[] {
  const seen = new Set(existing.map((i) => i.recording_id))
  const next = existing.slice()
  for (const item of incoming) {
    if (!seen.has(item.recording_id)) {
      seen.add(item.recording_id)
      next.push(item)
    }
  }
  return next
}
