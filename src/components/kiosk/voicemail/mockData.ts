// DEV ONLY - remove once /api/voicemails ships.
//
// Mock voicemails + tenant config for the Fono voicemail-route kiosk, ported
// from design_handoff_voicemail_kiosk/kiosk/data.js. Used as the fallback
// data source until the backend voicemail endpoints exist (see lib/api.ts
// fetchVoicemailKioskData / patchVoicemail* and the PR description).
//
// Differences from the prototype data.js, both per the architect's audit
// resolutions:
//   - The prototype's `processing` boolean is dropped. Processing state is
//     derived: a voicemail is "processing" when `transcript === null`
//     (see helpers.ts isProcessing). vm_002 below has null transcript /
//     summary / intent and therefore renders as a ProcessingCard.
//   - The tenant gains an `id` (required by the Tenant contract; absent in
//     data.js). Uses the Spice Garden tenant UUID from CLAUDE.md.
//
// Cover state matrix (unchanged from data.js):
//   - new + complete transcript (multiple intents)
//   - new + processing (audio captured, transcript not yet)
//   - new + repeat caller (count > 1)
//   - resolved
//   - hidden
//   - long transcript (overflow handling)
//   - callback_preference set vs null
//   - first-time caller vs repeat
//   - one card with a recognized caller_name, most without (MVP-realistic)

import type { Tenant, Voicemail } from './types'

const HOUR = 60 * 60 * 1000
const MIN = 60 * 1000
const NOW = Date.now()

// Tenant config - staff sees per-tenant display names. Keys stay
// machine-readable.
export const mockTenant: Tenant = {
  id: '5c59ba59-2bf0-40a4-b15a-2d96c509ef29',
  name: 'Spice Garden',
  location: 'Tracy, CA',
  routing_mode: 'voicemail',
  // Palette A swatch + tinted-header-band RGBA values are verbatim from the
  // CD README v2.3 "Tinted header band" / "Palette A - final per-category
  // swatches" tables. Rendering is CSS-driven via [data-c] selectors; these
  // values are the data-model mirror of those CSS rules.
  categories: [
    {
      key: 'order',
      display: 'Order',
      swatch: '#D4652C',
      tint: {
        light: 'rgba(212,101,44,.10)',
        dark: 'rgba(212,101,44,.18)',
        border: 'rgba(212,101,44,.30)',
      },
    },
    {
      key: 'catering',
      display: 'Catering',
      swatch: '#7B9C68',
      tint: {
        light: 'rgba(123,156,104,.12)',
        dark: 'rgba(123,156,104,.20)',
        border: 'rgba(123,156,104,.32)',
      },
    },
    {
      key: 'banquet_hall',
      display: 'Banquet hall',
      swatch: '#4A6D86',
      tint: {
        light: 'rgba(74,109,134,.12)',
        dark: 'rgba(74,109,134,.22)',
        border: 'rgba(74,109,134,.30)',
      },
    },
    {
      key: 'others',
      display: 'Others',
      swatch: '#B0A090',
      tint: {
        light: 'rgba(176,160,144,.18)',
        dark: 'rgba(176,160,144,.18)',
        border: 'rgba(176,160,144,.40)',
      },
    },
  ],
}

// The list, mixed across all tabs. Each tab filters by `status`.
export const mockVoicemails: Voicemail[] = [
  // 1 - fresh, order, short and clear
  {
    id: 'vm_001',
    caller_phone: '+14082459901',
    caller_name: null,
    captured_at: NOW - 3 * MIN,
    intent_category_key: 'order',
    intent_category_display_at_capture: 'Order',
    summary: 'Wants to add garlic naan and mango lassi to pickup order #4421.',
    transcript:
      "Hi, this is for the pickup order four four two one. Can you add one garlic naan and a mango lassi? I'm picking up at seven. Thanks.",
    audio_url: '',
    audio_duration_seconds: 14,
    callback_preference: null,
    repeat_caller_count: 0,
    repeat_caller_last_seen: null,
    structured_details_json: { order_ref: '#4421', items: ['Garlic naan', 'Mango lassi'] },
    status: 'new',
  },

  // 2 - processing (audio captured, transcript pending) - patient, no spinner
  {
    id: 'vm_002',
    caller_phone: '+15103302277',
    caller_name: null,
    captured_at: NOW - 1 * MIN - 20 * 1000,
    intent_category_key: null,
    intent_category_display_at_capture: null,
    summary: null,
    transcript: null,
    audio_url: '',
    audio_duration_seconds: 38,
    callback_preference: null,
    repeat_caller_count: 0,
    repeat_caller_last_seen: null,
    structured_details_json: null,
    status: 'new',
  },

  // 3 - catering, high-value, repeat caller
  {
    id: 'vm_003',
    caller_phone: '+14155550188',
    caller_name: 'Priya R.',
    captured_at: NOW - 22 * MIN,
    intent_category_key: 'catering',
    intent_category_display_at_capture: 'Catering',
    summary: 'Catering for ~40 people, Saturday lunch. Vegetarian, mild spice.',
    transcript:
      "Hi, I'm calling about catering for a small office lunch this Saturday around noon. We're about forty people, all vegetarian, on the milder side because we have some folks who don't do spicy. Could you call me back with options and pricing? My name is Priya. Thank you so much.",
    audio_url: '',
    audio_duration_seconds: 47,
    callback_preference: 'call back after 3pm',
    repeat_caller_count: 3,
    repeat_caller_last_seen: NOW - 11 * 24 * HOUR,
    structured_details_json: {
      event_date: 'Sat May 17',
      headcount: 40,
      dietary: ['vegetarian', 'mild'],
    },
    status: 'new',
  },

  // 4 - banquet hall, event-driven, longer transcript
  {
    id: 'vm_004',
    caller_phone: '+14087712450',
    caller_name: null,
    captured_at: NOW - 1 * HOUR - 12 * MIN,
    intent_category_key: 'banquet_hall',
    intent_category_display_at_capture: 'Banquet hall',
    summary:
      'Asking about banquet hall availability for June 14 engagement, ~120 guests.',
    transcript:
      'Hello, we are looking at venues for an engagement function on June fourteenth, Saturday evening. We are expecting around one hundred and twenty guests, mostly family. We need a stage area, and ideally a separate space for the buffet. Could you let us know if the banquet hall is open and what the package includes? Also is alcohol allowed? Thank you, you can reach me anytime in the evening.',
    audio_url: '',
    audio_duration_seconds: 72,
    callback_preference: 'evenings',
    repeat_caller_count: 0,
    repeat_caller_last_seen: null,
    structured_details_json: {
      event_date: 'Sat Jun 14',
      headcount: 120,
      event_type: 'Engagement',
      questions: ['Stage', 'Buffet space', 'Alcohol policy'],
    },
    status: 'new',
  },

  // 5 - others, brief, looking for hours
  {
    id: 'vm_005',
    caller_phone: '+16505550114',
    caller_name: null,
    captured_at: NOW - 2 * HOUR - 4 * MIN,
    intent_category_key: 'others',
    intent_category_display_at_capture: 'Others',
    summary: "Asking if you're open on Memorial Day Monday.",
    transcript:
      'Hi, just calling to see if you guys are open this Monday, the holiday. Thanks.',
    audio_url: '',
    audio_duration_seconds: 9,
    callback_preference: null,
    repeat_caller_count: 0,
    repeat_caller_last_seen: null,
    structured_details_json: null,
    status: 'new',
  },

  // 6 - order, repeat caller, named
  {
    id: 'vm_006',
    caller_phone: '+14086620055',
    caller_name: 'Anand',
    captured_at: NOW - 3 * HOUR - 40 * MIN,
    intent_category_key: 'order',
    intent_category_display_at_capture: 'Order',
    summary: 'Wants to place a large takeout order for tonight, prefers a text back.',
    transcript:
      'Hey, this is Anand. I want to do a takeout order for tonight around eight, family of six. Could you text me what biryani options you have today? Thanks.',
    audio_url: '',
    audio_duration_seconds: 23,
    callback_preference: 'text me',
    repeat_caller_count: 5,
    repeat_caller_last_seen: NOW - 6 * 24 * HOUR,
    structured_details_json: { pickup_time: '8:00 PM', headcount: 6 },
    status: 'new',
  },

  // 7 - RESOLVED tab
  {
    id: 'vm_007',
    caller_phone: '+15103339922',
    caller_name: null,
    captured_at: NOW - 5 * HOUR,
    intent_category_key: 'order',
    intent_category_display_at_capture: 'Order',
    summary: "Asked to swap rice to half-and-half on tonight's pickup.",
    transcript:
      'Hi, for the seven thirty pickup tonight, could you do half jeera rice half plain? Thanks.',
    audio_url: '',
    audio_duration_seconds: 12,
    callback_preference: null,
    repeat_caller_count: 1,
    repeat_caller_last_seen: NOW - 30 * 24 * HOUR,
    structured_details_json: null,
    status: 'resolved',
    resolved_at: NOW - 4 * HOUR - 12 * MIN,
    resolved_by: 'Front counter',
  },

  // 8 - RESOLVED, catering
  {
    id: 'vm_008',
    caller_phone: '+14157722013',
    caller_name: 'Meera',
    captured_at: NOW - 26 * HOUR,
    intent_category_key: 'catering',
    intent_category_display_at_capture: 'Catering',
    summary: 'Confirmed catering for 25 people Friday, sent quote.',
    transcript:
      "Hi following up on the catering for Friday. We're confirmed at twenty five people. Send the quote whenever.",
    audio_url: '',
    audio_duration_seconds: 18,
    callback_preference: null,
    repeat_caller_count: 2,
    repeat_caller_last_seen: NOW - 2 * 24 * HOUR,
    structured_details_json: { headcount: 25, event_date: 'Fri May 16' },
    status: 'resolved',
    resolved_at: NOW - 24 * HOUR,
    resolved_by: 'Srini',
  },

  // 9 - HIDDEN, spam-ish
  {
    id: 'vm_009',
    caller_phone: '+18005551212',
    caller_name: null,
    captured_at: NOW - 8 * HOUR,
    intent_category_key: 'others',
    intent_category_display_at_capture: 'Others',
    summary: 'Solicitation about extended warranty for restaurant equipment.',
    transcript:
      'This is a courtesy call regarding your business equipment warranty which may be expiring soon. Press one to speak to a representative or two to be removed from our list.',
    audio_url: '',
    audio_duration_seconds: 19,
    callback_preference: null,
    repeat_caller_count: 0,
    repeat_caller_last_seen: null,
    structured_details_json: null,
    status: 'hidden',
    hidden_at: NOW - 7 * HOUR - 50 * MIN,
    hidden_reason: 'spam',
  },

  // 10 - HIDDEN, accidental dial
  {
    id: 'vm_010',
    caller_phone: '+14082478811',
    caller_name: null,
    captured_at: NOW - 12 * HOUR,
    intent_category_key: 'others',
    intent_category_display_at_capture: 'Others',
    summary: 'Pocket dial, no clear speech.',
    transcript: '(muffled background sounds, no clear speech)',
    audio_url: '',
    audio_duration_seconds: 6,
    callback_preference: null,
    repeat_caller_count: 0,
    repeat_caller_last_seen: null,
    structured_details_json: null,
    status: 'hidden',
    hidden_at: NOW - 11 * HOUR,
    hidden_reason: 'not a real voicemail',
  },
]
