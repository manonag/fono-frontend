'use client'

import { tokens, SettingsCard } from '@/components/settings-primitives'

// Settings -> Calls voicemail-greeting editor. The tenant's custom message is
// spoken after a short automatic hours-aware lead-in (when closed, Fono
// prepends "We're closed right now."); blank falls back to the system default
// greeting. Mirrors the existing Call Greeting textarea + counter; the page
// owns the debounced PATCH (optimistic + rollback), so onChange is omitted
// (read-only) under impersonation.

type VoicemailGreetingCardProps = {
  value: string
  max: number
  onChange?: (next: string) => void
}

export function VoicemailGreetingCard({ value, max, onChange }: VoicemailGreetingCardProps) {
  const readOnly = !onChange
  return (
    <SettingsCard title="Voicemail greeting">
      <p style={{ fontSize: 12.5, color: tokens.muted, marginBottom: 12, lineHeight: 1.5 }}>
        What callers hear before the beep when they reach your voicemail. Fono
        first adds a short line based on your hours &mdash; when you&rsquo;re
        closed it prepends &ldquo;We&rsquo;re closed right now.&rdquo; &mdash;
        then plays your message below. Leave blank to use the default greeting.
      </p>
      <textarea
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        rows={4}
        maxLength={max}
        className="read-only:bg-gray-50 read-only:cursor-not-allowed"
        placeholder="e.g. Thanks for calling! Leave your name, what you're calling about, and a number to reach you, and we'll get back to you shortly."
        style={{
          width: '100%',
          padding: '10px 12px',
          fontSize: 14,
          fontFamily: 'inherit',
          color: '#1E0E00',
          border: '1px solid rgba(0,0,0,0.12)',
          borderRadius: 10,
          resize: 'vertical',
          outline: 'none',
          background: '#fff',
        }}
      />
      <div style={{ fontSize: 11, color: '#B0A090', marginTop: 4, textAlign: 'right' }}>
        {value.length} / {max}
      </div>
    </SettingsCard>
  )
}
