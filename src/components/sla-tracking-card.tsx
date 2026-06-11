'use client'

import { tokens, SettingsCard, ToggleSwitch } from '@/components/settings-primitives'

// Settings -> Calls SLA-tracking toggle. Gates whether the kiosk shows SLA
// timers/chrome for missed-call callbacks. ON (default) = current behavior;
// OFF = SLA chrome hidden. Explicit sla_enabled boolean, independent of the SLA
// window value (sla_minutes). Sibling to VoicemailCaptureCard; same single-
// control shape + optimistic-with-rollback PATCH wiring.

type SlaTrackingCardProps = {
  on: boolean
  onToggle?: (next: boolean) => void
}

export function SlaTrackingCard({ on, onToggle }: SlaTrackingCardProps) {
  return (
    <SettingsCard title="SLA tracking">
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
          <SlaMark />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: tokens.ink }}>
            Track callback SLA
          </div>
          <div style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
            Show the countdown timers on missed-call cards so your team can call
            back within the response-time window. Turn off to hide SLA timers.
          </div>
        </div>
        <ToggleSwitch on={on} onChange={onToggle} aria-label="Track callback SLA" />
      </div>
    </SettingsCard>
  )
}

function SlaMark() {
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
      <circle cx="12" cy="13" r="8" />
      <line x1="12" y1="13" x2="12" y2="9" />
      <line x1="12" y1="13" x2="15" y2="14" />
      <line x1="9" y1="2" x2="15" y2="2" />
    </svg>
  )
}
