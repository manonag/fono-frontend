// Pure helpers for the voicemail-route kiosk (Direction A - receipt).
//
// Formatters are ported from design_handoff_voicemail_kiosk/kiosk/common.jsx.
// They are intentionally NOT reused from src/lib/utils.ts: that module's
// formatPhoneNumber / formatDuration produce different output shapes
// (`+1 (XXX) XXX-XXXX`, `Xm Ys`) than the receipt design needs
// (`(XXX) XXX-XXXX`, `M:SS`), and are consumed by the dashboard surfaces.

import type {
  CategoryFilter,
  SortOrder,
  Status,
  TabCounts,
  Voicemail,
} from './types'

// --- time + phone formatters ----------------------------------------------

export function formatRelative(ts: number, nowMs: number): string {
  const d = Math.max(0, nowMs - ts)
  const min = Math.floor(d / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatExact(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDuration(s: number): string {
  const total = Math.max(0, Math.floor(s))
  const m = Math.floor(total / 60)
  const r = total % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function formatPhone(raw: string): string {
  if (!raw) return ''
  // E.164 +1XXXXXXXXXX -> (XXX) XXX-XXXX
  const m = raw.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  if (m) return `(${m[1]}) ${m[2]}-${m[3]}`
  return raw
}

// Real-time clock label for the header chrome, e.g. "8:26:05 AM".
export function formatClockWithSeconds(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

// --- ticket id ------------------------------------------------------------

// `#VM-001` style ticket id. The index is the card's position in the
// currently rendered (filtered + sorted) list, matching the prototype - so
// ticket ids are positional labels, not stable per-voicemail identifiers.
export function ticketId(index: number): string {
  return `#VM-${String(index + 1).padStart(3, '0')}`
}

// --- processing-state derivation ------------------------------------------

// A voicemail is "processing" when audio is captured but transcription has
// not completed. Per the CD README the trigger is
// `transcript == null && audio_url != null`; `audio_url` is a non-null
// string in the Voicemail contract, so the transcript check is the
// operative condition.
export function isProcessing(vm: Voicemail): boolean {
  return vm.transcript === null
}

// --- tab + filter helpers -------------------------------------------------

export const STATUSES: Status[] = ['new', 'resolved', 'hidden']

export const TAB_LABELS: Record<Status, string> = {
  new: 'New',
  resolved: 'Resolved',
  hidden: 'Hidden',
}

export function tabCount(voicemails: Voicemail[], status: Status): number {
  return voicemails.filter((v) => v.status === status).length
}

export function tabCounts(voicemails: Voicemail[]): TabCounts {
  return {
    new: tabCount(voicemails, 'new'),
    resolved: tabCount(voicemails, 'resolved'),
    hidden: tabCount(voicemails, 'hidden'),
  }
}

export function filterAndSort(
  voicemails: Voicemail[],
  opts: { status: Status; category: CategoryFilter; sort: SortOrder },
): Voicemail[] {
  let list = voicemails.filter((v) => v.status === opts.status)
  if (opts.category !== 'all') {
    list = list.filter((v) => v.intent_category_key === opts.category)
  }
  return list
    .slice()
    .sort((a, b) =>
      opts.sort === 'oldest'
        ? a.captured_at - b.captured_at
        : b.captured_at - a.captured_at,
    )
}
