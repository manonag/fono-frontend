'use client'

import { tokens } from '@/components/settings-primitives'

// Auto-detect line shown beneath the dial card: an "Auto-detected" pill,
// the detected carrier name, and an inline "Wrong carrier?" link that opens
// the carrier picker (wiring lives with the consumer). Visible whenever the
// carrier was auto-detected via Twilio Lookup (T-248 / hand-off §2.3).

type CarrierDetectedLineProps = {
  carrier: string
  onChangeCarrier?: () => void
}

export function CarrierDetectedLine({
  carrier,
  onChangeCarrier,
}: CarrierDetectedLineProps) {
  return (
    <div
      style={{
        marginTop: 12,
        fontSize: 12.5,
        color: tokens.body,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          color: tokens.successFg,
          background: tokens.successBg,
          padding: '3px 9px',
          borderRadius: 5,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.success }}
        />
        Auto-detected
      </span>
      <span>
        We detected <strong style={{ color: tokens.ink }}>{carrier}</strong>.
      </span>
      <button
        type="button"
        onClick={onChangeCarrier}
        style={{
          background: 'none',
          border: 'none',
          color: tokens.terra,
          fontSize: 12.5,
          fontWeight: 700,
          cursor: 'pointer',
          padding: 0,
          textDecoration: 'underline',
          textDecorationThickness: 1,
          textUnderlineOffset: 3,
        }}
      >
        Wrong carrier? Pick another &rarr;
      </button>
    </div>
  )
}
