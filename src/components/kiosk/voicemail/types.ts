// Shared types for the voicemail-route kiosk.
//
// IntentKey / Status / Category / Tenant / Voicemail / KioskPageProps /
// VoicemailCardProps originate from the CD design handoff. The v2.3 Layout C
// revision (binder-tab) extends Category with Palette A swatch + tint. T-228
// re-introduces `density` on VoicemailCardProps: the kiosk now has a
// user-facing 1-up / 2-up / list density toggle. Do not widen or narrow
// these without updating the design contract first.

export type IntentKey = 'order' | 'catering' | 'banquet_hall' | 'others'
export type Status = 'new' | 'resolved' | 'hidden'

export interface Category {
  key: IntentKey
  display: string // tenant-customizable display name
  // Palette A (v2.3 Layout C). `swatch` is the category's hex identity color
  // (spine tab, card swatch); `tint` carries the precomputed RGBA values for
  // the category-tinted card header band. Header tinting is rendered CSS-side
  // via [data-c] selectors in styles.module.css - these fields are the data
  // model representation, available for a future tenant-config backend (T-219).
  swatch: string
  tint: {
    light: string // header band background, light theme
    dark: string // header band background, dark theme
    border: string // header band dashed bottom border
  }
}

export interface Tenant {
  id: string
  name: string
  location: string
  routing_mode: 'sla' | 'voicemail'
  categories: Category[]
}

export interface Voicemail {
  id: string
  caller_phone: string // E.164
  caller_name: string | null
  captured_at: number // ms epoch
  intent_category_key: IntentKey | null // null while processing
  intent_category_display_at_capture: string | null // snapshot per CHIRAN #273
  summary: string | null // null while processing
  transcript: string | null // null while processing
  audio_url: string
  audio_duration_seconds: number
  callback_preference: string | null
  repeat_caller_count: number
  repeat_caller_last_seen: number | null // ms epoch
  structured_details_json: Record<string, unknown> | null
  status: Status
  resolved_at?: number
  resolved_by?: string
  hidden_at?: number
  hidden_reason?: string
}

// KioskPage
export interface KioskPageProps {
  tenant: Tenant // tenant from impersonation context OR session
}

// VoicemailCard
export interface VoicemailCardProps {
  voicemail: Voicemail
  index: number // for ticket-id display
  categories: Category[]
  onStatusChange: (id: string, status: Status) => void
  onReclassify: (id: string, key: IntentKey) => void
  density: Density
}

// ---------------------------------------------------------------------------
// Implementation-support types (not part of the CD prop contract).
// ---------------------------------------------------------------------------

// Category filter selection (spine binder tab): a category key or "all".
export type CategoryFilter = IntentKey | 'all'

// Sort order on the New tab.
export type SortOrder = 'newest' | 'oldest'

// Card density (T-228 user-facing toggle, persisted to localStorage):
//   one  - single column of full cards
//   two  - two-column grid of full cards (default)
//   list - single column of compact rows (key fields only)
export type Density = 'one' | 'two' | 'list'

// Tab counts surfaced in VoicemailTabs.
export interface TabCounts {
  new: number
  resolved: number
  hidden: number
}
