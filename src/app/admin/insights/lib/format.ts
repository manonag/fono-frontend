// Display helpers for the /admin/insights dashboard (sprint 1610b462).

// Turn a snake_case enum value into a readable label:
// 'ready_to_buy' -> 'Ready to buy'.
export function humanize(value: string | null | undefined): string {
  if (!value) return '-'
  return value.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

// Compact relative time, e.g. '3h ago'. Mirrors the formatRelative used
// in admin/page.tsx, extended with a months bucket.
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return 'unknown'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

// Full local timestamp, shown on hover via the title attribute.
export function formatAbsolute(iso: string | null | undefined): string {
  if (!iso) return 'unknown'
  return new Date(iso).toLocaleString()
}
