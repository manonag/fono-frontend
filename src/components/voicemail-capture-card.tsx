'use client'

import { tokens, SettingsCard, ToggleSwitch } from '@/components/settings-primitives'

// Settings -> Calls voicemail-capture toggle (T-311). Gates whether Fono
// records + classifies the missed-call voicemail tail when staff do not
// answer. Upstream of Categories (which label those voicemails) and the
// Voicemails kiosk tab (T-310). Single control, mirrors NotificationsMiniCard.

type VoicemailCaptureCardProps = {
  on: boolean
  onToggle?: (next: boolean) => void
}

export function VoicemailCaptureCard({ on, onToggle }: VoicemailCaptureCardProps) {
  return (
    <SettingsCard title="Voicemail capture">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 16px',
          borderRadius: 12,
          background: '#fff',
          border: `1px solid ${tokens.rule}`,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(224,96,42,0.10)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
          }}
        >
          <VoicemailMark />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: tokens.ink }}>
            Capture missed-call voicemails
          </div>
          <div style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
            When your team can&rsquo;t pick up, Fono records the caller&rsquo;s
            voicemail, transcribes it, and sorts it by category on the kiosk.
          </div>
        </div>
        <ToggleSwitch on={on} onChange={onToggle} aria-label="Capture missed-call voicemails" />
      </div>
    </SettingsCard>
  )
}

function VoicemailMark() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#E0602A"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="13" r="4" />
      <circle cx="18" cy="13" r="4" />
      <line x1="6" y1="17" x2="18" y2="17" />
    </svg>
  )
}
