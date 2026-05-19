// v3.3 Settings -> Calls section numbering rule (CD hand-off §5.5).
//
// SectionId is the stable per-section identity; the displayed number is
// derived per call_setup_path so the visible numbering stays sequential
// regardless of which sections are present on the current path.
//
//   live      shows: connect, how-fono-answers, call-routing, categories, notifications
//   voicemail shows: connect, how-fono-answers,               categories, notifications
//
// Sections that are locked (path not yet picked, or forwarding not yet
// verified) suppress their displayed number entirely so the user sees
// numbers only on the rows they can act on.

export type SectionId =
  | 'connect'
  | 'how-fono-answers'
  | 'call-routing'
  | 'categories'
  | 'notifications'

const SECTION_ORDER: Record<'live' | 'voicemail', SectionId[]> = {
  live: ['connect', 'how-fono-answers', 'call-routing', 'categories', 'notifications'],
  voicemail: ['connect', 'how-fono-answers', 'categories', 'notifications'],
}

export function displayNumberFor(
  section: SectionId,
  path: 'live' | 'voicemail',
  locked: boolean,
): string | null {
  if (locked) return null
  const order = SECTION_ORDER[path]
  const idx = order.indexOf(section)
  if (idx === -1) return null
  return String(idx + 1).padStart(2, '0')
}
