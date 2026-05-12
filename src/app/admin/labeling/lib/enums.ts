// keep in sync with backend admin_labeling_enums.py

export const STATUSES = [
  'auto_labeled',
  'in_review',
  'verified',
  'gold',
] as const
export type Status = (typeof STATUSES)[number]

export const STATUS_RANK: Record<Status, number> = {
  auto_labeled: 0,
  in_review: 1,
  verified: 2,
  gold: 3,
}

// T-2d16e333: explicit allowlist of backwards transitions for recovery
// actions. Mirrors backend admin_labeling_enums.ALLOWED_BACKWARD_TRANSITIONS.
// Keep in sync; backend is source of truth for what the API accepts.
export const ALLOWED_BACKWARD_TRANSITIONS: ReadonlyArray<readonly [Status, Status]> = [
  ['verified', 'auto_labeled'],
  ['gold', 'verified'],
] as const

export function canTransition(from: Status, to: Status): boolean {
  if (STATUS_RANK[to] >= STATUS_RANK[from]) return true
  return ALLOWED_BACKWARD_TRANSITIONS.some(
    ([f, t]) => f === from && t === to,
  )
}

export const LANGUAGE_PROFILES = [
  'english_dominant',
  'indian_dominant',
  'mixed_codeswitched',
  'multilingual_call',
  'english_only',
  'unintelligible',
] as const
export type LanguageProfile = (typeof LANGUAGE_PROFILES)[number]

export const LANGUAGE_PROFILE_LABELS: Record<LanguageProfile, string> = {
  english_dominant: 'English dominant',
  indian_dominant: 'Indian dominant',
  mixed_codeswitched: 'Mixed codeswitched',
  multilingual_call: 'Multilingual call',
  english_only: 'English only',
  unintelligible: 'Unintelligible',
}

export const CALL_TYPES = [
  'order',
  'inquiry',
  'complaint',
  'internal_test_call',
  'voicemail_outgoing',
  'hangup',
  'wrong_number',
  'unknown',
] as const
export type CallType = (typeof CALL_TYPES)[number]

export const CALL_TYPE_LABELS: Record<CallType, string> = {
  order: 'Order',
  inquiry: 'Inquiry',
  complaint: 'Complaint',
  internal_test_call: 'Internal test call',
  voicemail_outgoing: 'Voicemail outgoing',
  hangup: 'Hangup',
  wrong_number: 'Wrong number',
  unknown: 'Unknown',
}

export const ERROR_TAGS = [
  'missed_word',
  'wrong_language_tag',
  'speaker_misattributed',
  'substituted_word',
  'hallucinated_word',
  'missed_codeswitch_boundary',
  'menu_item_misheard',
  'name_misheard',
  'restaurant_name_misheard',
  'number_misheard',
  'script_inconsistency',
] as const
export type ErrorTag = (typeof ERROR_TAGS)[number]

export const ERROR_TAG_LABELS: Record<ErrorTag, string> = {
  missed_word: 'Missed word',
  wrong_language_tag: 'Wrong language tag',
  speaker_misattributed: 'Speaker misattributed',
  substituted_word: 'Substituted word',
  hallucinated_word: 'Hallucinated word',
  missed_codeswitch_boundary: 'Missed codeswitch boundary',
  menu_item_misheard: 'Menu item misheard',
  name_misheard: 'Name misheard (caller)',
  restaurant_name_misheard: 'Restaurant name misheard',
  number_misheard: 'Number misheard',
  script_inconsistency: 'Script inconsistency',
}

export const AUDIO_QUALITY_TAGS = [
  'clean',
  'background_noise',
  'low_volume',
  'distorted',
] as const
export type AudioQualityTag = (typeof AUDIO_QUALITY_TAGS)[number]

export const AUDIO_QUALITY_LABELS: Record<AudioQualityTag, string> = {
  clean: 'Clean',
  background_noise: 'Background noise',
  low_volume: 'Low volume',
  distorted: 'Distorted',
}

export const STATUS_LABELS: Record<Status, string> = {
  auto_labeled: 'Auto-labeled',
  in_review: 'In review',
  verified: 'Verified',
  gold: 'Gold',
}
