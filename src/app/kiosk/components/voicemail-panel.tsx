'use client'

// Read-only voicemail grid for the SLA/calls kiosk (T-310, Option A per fact
// #360). A Live tenant with voicemail_enabled captures its missed-call
// voicemail tail, but routing_mode='sla' routes it to this kiosk rather than
// the voicemail-route binder kiosk — so the captures were invisible. This
// panel surfaces them as a Voicemails tab.
//
// Scope is deliberately read-only: it proves the capture + classification +
// chip-stamp pipeline on the operator's screen and lets staff listen + read.
// Status/reclassify mutations live on the full voicemail-route kiosk
// (components/kiosk/voicemail/KioskPage). Category bucketing reuses the FE #25
// helpers (effectiveCategory) so the swatch/display match that surface exactly.

import { effectiveCategory, formatPhone, formatRelative } from '@/components/kiosk/voicemail/helpers'
import type { Category, Voicemail } from '@/components/kiosk/voicemail/types'

interface VoicemailPanelProps {
  voicemails: Voicemail[]
  categories: Category[]
  dark: boolean
}

function CategoryChip({ vm, categories, dark }: { vm: Voicemail; categories: Category[]; dark: boolean }) {
  const cat = effectiveCategory(vm.intent_category_key, categories)
  // Processing (transcript/intent not yet computed): a neutral pill.
  if (!cat) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.04em',
          color: dark ? 'rgba(253,240,232,0.45)' : '#8B7355',
          backgroundColor: dark ? 'rgba(253,240,232,0.06)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${dark ? 'rgba(253,240,232,0.10)' : 'rgba(0,0,0,0.08)'}`,
        }}
      >
        Transcribing…
      </span>
    )
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: dark ? '#FDF0E8' : '#1E0E00',
        backgroundColor: dark ? cat.tint.dark : cat.tint.light,
        border: `1px solid ${cat.tint.border}`,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cat.swatch, flexShrink: 0 }} />
      {cat.display}
    </span>
  )
}

function VoicemailCard({ vm, categories, dark }: { vm: Voicemail; categories: Category[]; dark: boolean }) {
  const cardBg = dark ? '#161920' : '#FFFFFF'
  const cardBorder = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const primary = dark ? '#FDF0E8' : '#1E0E00'
  const muted = dark ? 'rgba(253,240,232,0.5)' : '#8B7355'
  const processing = vm.transcript === null
  const body = vm.summary || vm.transcript

  return (
    <div
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Caller + time */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: primary }}>
          {vm.caller_name || formatPhone(vm.caller_phone)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: muted, whiteSpace: 'nowrap' }}>
          {formatRelative(vm.captured_at, Date.now())}
        </span>
      </div>

      {/* Caller name shown above means the number drops to a subline */}
      {vm.caller_name && (
        <span style={{ fontSize: 13, fontWeight: 600, color: muted, marginTop: -6 }}>
          {formatPhone(vm.caller_phone)}
        </span>
      )}

      {/* Category chip stamp */}
      <div>
        <CategoryChip vm={vm} categories={categories} dark={dark} />
      </div>

      {/* Summary / transcript */}
      {processing ? (
        <p style={{ margin: 0, fontSize: 13, fontStyle: 'italic', color: muted, lineHeight: 1.5 }}>
          Transcribing this voicemail…
        </p>
      ) : body ? (
        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            color: dark ? 'rgba(253,240,232,0.78)' : '#3A2A1E',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {body}
        </p>
      ) : null}

      {/* Audio */}
      {vm.audio_url ? (
        <audio
          controls
          preload="none"
          src={vm.audio_url}
          style={{ width: '100%', height: 34, marginTop: 2 }}
        />
      ) : null}
    </div>
  )
}

export function VoicemailPanel({ voicemails, categories, dark }: VoicemailPanelProps) {
  if (voicemails.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke={dark ? 'rgba(253,240,232,0.15)' : 'rgba(0,0,0,0.1)'}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="11" width="20" height="9" rx="2" />
          <circle cx="7" cy="15.5" r="2.5" />
          <circle cx="17" cy="15.5" r="2.5" />
          <path d="M7 13V7a5 5 0 0110 0v6" />
        </svg>
        <span style={{ fontSize: 16, color: dark ? 'rgba(253,240,232,0.3)' : '#8B7355', fontWeight: 500 }}>
          No voicemails yet.
        </span>
      </div>
    )
  }

  // Newest first, defensive (backend already returns newest-100).
  const sorted = [...voicemails].sort((a, b) => b.captured_at - a.captured_at)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 14,
      }}
    >
      {sorted.map((vm) => (
        <VoicemailCard key={vm.id} vm={vm} categories={categories} dark={dark} />
      ))}
    </div>
  )
}
