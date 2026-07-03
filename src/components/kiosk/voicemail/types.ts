// Shared types for the voicemail-route kiosk.
//
// IntentKey / Status / Category / Tenant / Voicemail / KioskPageProps /
// VoicemailCardProps originate from the CD design handoff. The v2.3 Layout C
// revision (binder-tab) extends Category with Palette A swatch + tint and
// drops `density` from VoicemailCardProps (the grid is locked to 2-up). Do
// not widen or narrow these without updating the design contract first.

// The 6 backend classifier keys (chip taxonomy Option A, 2026-06-08): a
// voicemail's intent_category_key is always one of these; tenants surface up
// to 5 as chips, and unsurfaced keys fold into "others" on the kiosk
// (bucketing). Widened from the original 4-key set (T-239); kept in sync with
// the backend app/services/categories.py ChipKey enum.
export type IntentKey =
  | 'order'
  | 'reservation'
  | 'menu_question'
  | 'catering'
  | 'banquet_hall'
  | 'others'
// T-418: 'ignore' supersedes 'hidden' (kept as a back-compat alias for old
// rows and external readers); 'spam' is the blocklist status.
export type Status = 'new' | 'resolved' | 'hidden' | 'ignore' | 'spam'

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
  // The tenant's chosen call path (onboarding funnel, T-251). 'live' tenants
  // forward unanswered calls to Fono and stay on the SLA kiosk; 'voicemail'
  // tenants route straight to voicemail. routing_mode is BACKEND-DERIVED from
  // this ('live' -> 'sla'), so the coexistence branch keys off call_setup_path
  // directly rather than routing_mode (CHIRAN arch fact #362). null before the
  // call path is chosen. Returned by GET /tenants/{id} kiosk config.
  call_setup_path: 'live' | 'voicemail' | null
  // Whether voicemail capture is on for this tenant. A Live (routing_mode
  // 'sla') tenant can still have voicemail_enabled true — its missed-call
  // voicemail tail is captured. For Live + voicemail tenants the Voicemails
  // tab renders the nested Layout C surface (coexistence variant); this flag
  // gates that tab's visibility.
  voicemail_enabled: boolean
  // Owner-facing SLA-tracking toggle (BE PR #33). true = the coexistence kiosk
  // shows the Live/SLA tabs as shipped; false = voicemail-led (Missed/Recovered/
  // Ignored + the Voicemails tab/segmented are hidden, New/Resolved/Hidden are
  // promoted to primary sage tabs). DEFAULT TRUE: fetchTenantVoicemailConfig
  // coerces an absent field to true so a missing value never flips a tenant
  // into voicemail-led mode (the PR #28 type-without-mapping lesson).
  sla_enabled: boolean
  // T-418 single gate: when true the kiosk shows the spam/punch surface AND
  // the backend enforces the inbound blocklist. Default/absent = false; UI and
  // enforcement flip together as one unit.
  spam_blocklist_enabled?: boolean
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
  // T-418: ignore (supersedes hidden) + spam/blocklist surface fields.
  ignored_at?: number
  ignore_reason?: string
  blocked?: boolean
  spam_at?: number
  spam_by?: string
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
  // Read-only impersonation (admin "View as Tenant"): write affordances
  // (resolve / hide / reclassify / call) render visibly disabled rather than
  // silently no-op'ing. Defaults false so the standalone kiosk is unaffected.
  readOnly?: boolean
  // Outbound callback bridge (coexistence kiosk). When provided, the phone
  // button hands the voicemail id up so the parent opens the confirm-bridge
  // modal + POSTs. When omitted (standalone kiosk), the card falls back to its
  // tel: dialer stand-in.
  onCall?: (id: string) => void
  // T-418 punch surface (gated on tenant.spam_blocklist_enabled). When false
  // (default) the card renders byte-identical to today; when true it renders
  // the punch action row, when-chip, ignore/spam states, arrival + high-value
  // treatment.
  punch?: boolean
  onSpamRequest?: (vm: Voicemail) => void
  onUnblockRequest?: (vm: Voicemail) => void
  justArrived?: boolean
  onSeen?: (id: string) => void
}

// ---------------------------------------------------------------------------
// Implementation-support types (not part of the CD prop contract).
// ---------------------------------------------------------------------------

// Category filter selection (spine binder tab): a category key or "all".
export type CategoryFilter = IntentKey | 'all'

// Sort order on the New tab.
export type SortOrder = 'newest' | 'oldest'

// Tab counts surfaced in VoicemailTabs.
export interface TabCounts {
  new: number
  resolved: number
  hidden: number
  ignore: number
  spam: number
}
