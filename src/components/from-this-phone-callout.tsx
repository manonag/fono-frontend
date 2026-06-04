'use client'

import { tokens, PhoneIcon, GoogleMark } from '@/components/settings-primitives'

// "FROM THIS PHONE" callout — shows the Google-synced restaurant number
// prominently above the dial code, so the owner never wonders which phone
// to dial from. Used in wizard Step 5, Settings -> Calls State B, and the
// State C Connect section.

type FromThisPhoneCalloutProps = {
  tenantPhone: string
  tenantName: string
  syncedFromGoogle?: boolean
}

export function FromThisPhoneCallout({
  tenantPhone,
  tenantName,
  syncedFromGoogle = true,
}: FromThisPhoneCalloutProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        borderRadius: 12,
        background: '#fff',
        border: `1.5px solid ${tokens.rule}`,
        marginBottom: 14,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: tokens.fieldBg,
          color: tokens.terra,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        <PhoneIcon size={14} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: tokens.muted,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 3,
          }}
        >
          From this phone
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: tokens.ink,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            }}
          >
            {tenantPhone}
          </span>
          <span style={{ fontSize: 12, color: tokens.muted }}>{tenantName}</span>
          {syncedFromGoogle && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                fontWeight: 600,
                color: tokens.hint,
                padding: '2px 7px',
                borderRadius: 5,
                background: tokens.fieldBg,
              }}
            >
              <GoogleMark size={12} /> synced from Google
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
