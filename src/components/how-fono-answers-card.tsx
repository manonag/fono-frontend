'use client'

import {
  tokens,
  SettingsCard,
  SettingsButton,
  TextField,
  FieldLabel,
  HelperText,
  Banner,
  WarnIcon,
} from '@/components/settings-primitives'
import { PathCard } from '@/components/path-card'
import { ComparisonChart } from '@/components/comparison-chart'

// Settings -> Calls §2 "How Fono Answers" (State C). The read/edit surface
// for the call path: the PathCard pair, the comparison chart, the switching
// note, and (Fono Live only) the staff-phone field with same-phone guard.
//
// Note: this reuses the minimal PathCard shipped in T-253. The richer
// animated path cards in the mockup are a later enrichment; the comparison
// chart carries the full per-path detail here.

type HowFonoAnswersCardProps = {
  pick: 'live' | 'voicemail'
  onSelectPath?: (path: 'live' | 'voicemail') => void
  staffPhone?: string
  onStaffPhoneChange?: (next: string) => void
  onVerifyStaff?: () => void
  samePhoneError?: boolean
}

export function HowFonoAnswersCard({
  pick,
  onSelectPath,
  staffPhone = '',
  onStaffPhoneChange,
  onVerifyStaff,
  samePhoneError = false,
}: HowFonoAnswersCardProps) {
  return (
    <SettingsCard title="How Fono Answers" badge="Call Path">
      <p style={{ fontSize: 13, color: tokens.body, margin: '0 0 16px', lineHeight: 1.55 }}>
        Both paths involve your team answering calls. The difference is just{' '}
        <em style={{ fontStyle: 'normal', color: tokens.ink, fontWeight: 600 }}>
          when Fono shows up
        </em>{' '}
        in the call flow.
      </p>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <PathCard
          path="live"
          pick={pick === 'live'}
          recommended
          onSelect={onSelectPath ? () => onSelectPath('live') : undefined}
        />
        <PathCard
          path="voicemail"
          pick={pick === 'voicemail'}
          onSelect={onSelectPath ? () => onSelectPath('voicemail') : undefined}
        />
      </div>

      <ComparisonChart currentPick={pick} />

      <p style={{ fontSize: 12.5, color: tokens.muted, margin: '16px 0 0', lineHeight: 1.55 }}>
        Changing this updates how your kiosk works going forward. Existing
        missed-call cards stay on your kiosk until they resolve naturally.
      </p>

      {pick === 'live' && (
        <div style={{ marginTop: 22, paddingTop: 22, borderTop: `1px dashed ${tokens.rule}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <FieldLabel style={{ margin: 0 }}>Staff phone</FieldLabel>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: tokens.terra,
                padding: '2px 7px',
                borderRadius: 5,
                background: 'rgba(224,96,42,0.10)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Required for Fono Live
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <TextField
              value={staffPhone}
              onChange={onStaffPhoneChange}
              monospace
              error={samePhoneError}
              placeholder="+1 (___) ___ ____"
              aria-label="Staff phone number"
            />
            <SettingsButton variant="outline" onClick={onVerifyStaff}>
              Verify
            </SettingsButton>
          </div>
          <HelperText tone={samePhoneError ? 'danger' : 'muted'}>
            Where Fono bridges callers to. Must be different from your restaurant
            phone.
          </HelperText>
          {samePhoneError && (
            <div style={{ marginTop: 12 }}>
              <Banner
                tone="danger"
                icon={<WarnIcon size={16} />}
                title="Same as your restaurant phone"
              >
                Fono Live needs two different phones. Pick a different number or
                switch to Fono Voicemail.
              </Banner>
            </div>
          )}
        </div>
      )}
    </SettingsCard>
  )
}
