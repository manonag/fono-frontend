export function formatMmSs(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '—'
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function speakerLabel(speakerId: string): string {
  const m = /(\d+)/.exec(speakerId)
  if (!m) return speakerId
  const n = parseInt(m[1], 10)
  return `S${n + 1}`
}

export function truncate(s: string | null | undefined, max: number): string {
  if (!s) return ''
  if (s.length <= max) return s
  return s.slice(0, max).trimEnd() + '…'
}
