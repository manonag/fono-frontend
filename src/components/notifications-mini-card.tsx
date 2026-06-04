'use client'

import {
  tokens,
  SettingsCard,
  ToggleSwitch,
  TextField,
  FieldLabel,
  HelperText,
} from '@/components/settings-primitives'

// Settings -> Calls §5 "Notifications" (CD §6). A single control in v1:
// WhatsApp missed-call alerts on/off plus the alert phone number. The killed
// daily-email / weekly-report / long-call toggles do not appear.

type NotificationsMiniCardProps = {
  on: boolean
  onToggle?: (next: boolean) => void
  phone: string
  onPhoneChange?: (next: string) => void
}

export function NotificationsMiniCard({
  on,
  onToggle,
  phone,
  onPhoneChange,
}: NotificationsMiniCardProps) {
  return (
    <SettingsCard title="Notifications" badge="WhatsApp">
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
            background: '#E7F8EF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flex: '0 0 auto',
          }}
        >
          <WhatsAppMark />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: tokens.ink }}>
            WhatsApp missed-call alerts
          </div>
          <div style={{ fontSize: 12, color: tokens.muted, marginTop: 2 }}>
            We&rsquo;ll send a WhatsApp message when you miss a call.
          </div>
        </div>
        <ToggleSwitch on={on} onChange={onToggle} aria-label="WhatsApp missed-call alerts" />
      </div>

      <div style={{ marginTop: 14 }}>
        <FieldLabel>Phone for alerts</FieldLabel>
        <TextField
          value={phone}
          onChange={onPhoneChange}
          monospace
          aria-label="Alert phone number"
        />
        <HelperText>E.164 format. Can be different from staff phone.</HelperText>
      </div>
    </SettingsCard>
  )
}

function WhatsAppMark() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.515 5.27l-.999 3.648 3.973-.617z" />
    </svg>
  )
}
