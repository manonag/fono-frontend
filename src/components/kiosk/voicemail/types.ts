// Shared types for the voicemail-route kiosk (Direction A - receipt).
//
// IntentKey / Status / Category / Tenant / Voicemail / KioskPageProps /
// VoicemailCardProps are transcribed verbatim from the CD design handoff
// (design_handoff_voicemail_kiosk/README.md, section "Component prop
// contracts"). Do not widen or narrow these without updating the design
// contract first.

export type IntentKey = 'order' | 'catering' | 'banquet_hall' | 'others'
export type Status = 'new' | 'resolved' | 'hidden'

export interface Category {
  key: IntentKey
  display: string // tenant-customizable display name
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
  density: 'one' | 'two' | 'list'
  onStatusChange: (id: string, status: Status) => void
  onReclassify: (id: string, key: IntentKey) => void
}

// ---------------------------------------------------------------------------
// Implementation-support types (not part of the CD prop contract).
// ---------------------------------------------------------------------------

// Density union kept whole so VoicemailCardProps stays byte-for-byte the
// design contract. v1 ships 'one' only (brief section 9); 'two' and 'list'
// are intentionally unbuilt.
export type Density = 'one' | 'two' | 'list'

// Category filter selection on the New tab.
export type CategoryFilter = IntentKey | 'all'

// Sort order on the New tab.
export type SortOrder = 'newest' | 'oldest'

// Tab counts surfaced in VoicemailTabs.
export interface TabCounts {
  new: number
  resolved: number
  hidden: number
}
