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
  sarvam_language_code: string | null
  language_profile_tag: LanguageProfile | null
  call_type_tag: CallType | null
  status: Status
  is_holdout: boolean
  error_count: number
  verified_at: string | null
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
}

export interface PatchPayload {
  verified_transcript?: string
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
  mean_words_machine: number | null
  mean_words_verified: number | null
  total_reviews: number
  total_recordings_with_audio: number
  fetched_at: string
}

export type QueueFilter = 'all' | Status

export type SortKey = 'duration_desc' | 'duration_asc' | 'created_desc'
