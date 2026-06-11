import type {
  AudioQualityTag,
  CallType,
  ErrorTag,
  LanguageProfile,
  Status,
} from './enums'

export interface QueueItem {
  recording_id: string
  duration_seconds: number | null
  tenant_name: string
  call_started_at: string | null
  machine_transcript_preview: string | null
  verified_transcript_preview: string | null
  sarvam_language_code: string | null
  language_profile_tag: LanguageProfile | null
  call_type_tag: CallType | null
  status: Status
  is_holdout: boolean
  error_count: number
  verified_at: string | null
  // T-204: lock-aware fields. Owners see locks held by anyone; labelers
  // never see rows locked by another user (filtered server-side), so the
  // only non-null lock_holder_user_id a labeler ever sees is their own.
  lock_holder_user_id: string | null
  lock_holder_name: string | null
  lock_expires_at: string | null
  // Phase C.3 Sprint 1 claim fields. claimed_by_name drives the owner
  // "Claimed by X" chip (Bite 4); the labeler My Queue keys off claimed_at.
  claimed_by_user_id: string | null
  claimed_by_name: string | null
  claimed_at: string | null
}

export interface QueueResponse {
  items: QueueItem[]
  total: number
  fetched_at: string
}

export interface DiarizationEntry {
  speaker_id: string
  transcript: string
  start_time_seconds: number
  end_time_seconds: number
}

export interface VerifiedSegment {
  speaker_id: string
  transcript: string
  start_time_seconds: number
  end_time_seconds: number
  // Optional authorship stamps (backend Commit 2). UI does not surface
  // them in V1; they round-trip through PATCH payloads so the server can
  // diff against the prior version.
  edited_by_user_id?: string | null
  edited_at?: string | null
}

export interface RecordingDetail {
  recording_id: string
  review_id: string
  tenant_id: string
  tenant_name: string
  call: {
    id: string
    twilio_call_sid: string | null
    caller_number_masked: string | null
    call_status: string | null
    consent_status: string | null
    started_at: string | null
    ended_at: string | null
    duration_seconds: number | null
  }
  recording: {
    id: string
    twilio_recording_sid: string | null
    duration_seconds: number | null
    file_size_bytes: number | null
    r2_object_key: string | null
    audio_url: string
    audio_url_expires_in_seconds: number
  }
  machine: {
    transcript: string | null
    provider: string | null
    confidence_avg: number | null
    language_code: string | null
    language_tags: Record<string, string> | null
    diarization: { entries: DiarizationEntry[] } | null
    timestamps: unknown
    raw_response: unknown
    labeled_at: string | null
  }
  verified_transcript: string | null
  verified_segments: VerifiedSegment[]
  verified_at: string | null
  verified_by: string | null
  error_tags: ErrorTag[]
  error_count: number
  audio_quality_tag: AudioQualityTag | null
  language_profile_tag: LanguageProfile | null
  call_type_tag: CallType | null
  contains_menu_items: boolean
  contains_prices: boolean
  contains_phone_numbers: boolean
  contains_names: boolean
  status: Status
  is_holdout: boolean
  reviewer_notes: string | null
  created_at: string
  updated_at: string
  // T-204
  lock_holder_user_id: string | null
  lock_holder_name: string | null
  lock_acquired_at: string | null
  lock_expires_at: string | null
  labeler_user_id: string | null
  reviewed_by_user_id: string | null
  reviewer_notes_for_labeler: string | null
  // Send-back-with-edits workflow (backend Commit 2). owner_segments is
  // null unless the row was sent back with inline edits; owner_review_at
  // stamps the most recent Send back action.
  owner_segments: VerifiedSegment[] | null
  owner_review_at: string | null
}

export interface PatchPayload {
  verified_transcript?: string
  verified_segments?: VerifiedSegment[]
  error_tags?: ErrorTag[]
  audio_quality_tag?: AudioQualityTag | null
  language_profile_tag?: LanguageProfile | null
  call_type_tag?: CallType | null
  contains_menu_items?: boolean
  contains_prices?: boolean
  contains_phone_numbers?: boolean
  contains_names?: boolean
  is_holdout?: boolean
  reviewer_notes?: string | null
  status?: Status
  // Owner review actions. 'approve' flips an in_review row to verified;
  // 'reject' (legacy, retained in API for backwards compat) flips back to
  // auto_labeled; 'send_back' flips to suggestions_pending with optional
  // owner_segments persisted as the owner's edited suggestion overlay.
  review_action?: 'approve' | 'reject' | 'send_back'
  reviewer_notes_for_labeler?: string | null
  // Send-back-with-edits payload. Owner's edited segments when the
  // 'send_back' action carries edits; omit for notes-only send back.
  owner_segments?: VerifiedSegment[]
  // Labeler's reconciliation when resolving a suggestions_pending row
  // back to in_review (Commit 5 wires this on the labeler page).
  resolved_segments?: VerifiedSegment[]
}

export interface LabelerCounts {
  verified: number
  in_review: number
  rejected: number
  total: number
  // Phase C.3 Sprint 1: live open-claim count (claimed_by_user_id = this
  // user). Optional for deploy-order safety; treat absent as 0.
  claimed?: number
}

export interface LabelerSummary {
  id: string
  email: string
  name: string
  role: 'owner' | 'labeler'
  active: boolean
  created_at: string | null
  last_login_at: string | null
  created_by_user_id: string | null
  counts: LabelerCounts
  last_active_at: string | null
}

export interface StatsResponse {
  by_status: Partial<Record<Status, number>>
  by_language_profile: Record<string, number>
  by_call_type: Record<string, number>
  error_distribution: Record<string, number>
  by_tenant: Array<{
    tenant_id: string
    tenant_name: string
    by_status: Partial<Record<Status, number>>
  }>
  by_labeler: LabelerSummary[]
  mean_words_machine: number | null
  mean_words_verified: number | null
  total_reviews: number
  total_recordings_with_audio: number
  fetched_at: string
}

export interface MeResponse {
  user_id: string
  email: string
  name: string | null
  role: 'owner' | 'labeler'
  active: boolean
  is_admin: boolean
}

export interface ActiveLabeler {
  user_id: string
  name: string | null
  email: string
  role: 'owner' | 'labeler'
  last_activity_at: string
}

export interface ActiveLabelersResponse {
  items: ActiveLabeler[]
}

export interface ReviewQueueItem {
  recording_id: string
  tenant_id: string
  tenant_name: string
  call_started_at: string | null
  duration_seconds: number | null
  machine_transcript_preview: string
  verified_transcript_preview: string
  language_profile_tag: LanguageProfile | null
  call_type_tag: CallType | null
  status: Status
  labeler_user_id: string | null
  labeler_name: string | null
  labeler_email: string | null
  in_review_since: string | null
  error_count: number
}

export interface ReviewQueueResponse {
  items: ReviewQueueItem[]
  total: number
  limit: number
  offset: number
  fetched_at: string
}

export type QueueFilter = 'all' | Status

export type SortKey = 'duration_desc' | 'duration_asc' | 'created_desc'

// Phase C.3 Sprint 1: the two server-side views a labeler may request.
// Anything else is a 403 forbidden_view, so the labeler tab row exposes
// exactly these two.
export type LabelerView = 'pending' | 'mine'

export interface ClaimResult {
  recording_id: string
  claimed_by_user_id: string
  claimed_at: string
  status: Status
  audit_action: string
  audit_extra: Record<string, unknown>
}

export interface ReleaseResult {
  recording_id: string
  status_before: Status
  status_after: Status
  fields_updated: string[]
  released_claim_of_user_id: string | null
  audit_action: string
  audit_extra: Record<string, unknown>
}

export interface ReassignResult {
  recording_id: string
  claimed_by_user_id: string
  claimed_at: string
  status: Status
  audit_action: string
  audit_extra: Record<string, unknown>
}
