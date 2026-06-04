'use client'

import type { ReactNode } from 'react'
import { tokens, Banner, SettingsButton, CheckIcon } from '@/components/settings-primitives'
import { FromThisPhoneCallout } from '@/components/from-this-phone-callout'
import { DialThisCard } from '@/components/dial-this-card'
import { CarrierDetectedLine } from '@/components/carrier-detected-line'
import {
  forwardingCodeFor,
  CARRIER_LABELS,
  type Carrier,
  type CallPath,
} from '@/lib/forwarding-codes'

// The reusable dial-and-verify card (CD hand-off §2.3). Composes the
// FROM THIS PHONE callout, the dark DIAL THIS card, the carrier auto-detect
// line, and the state-machine action area. Used in 5 places: wizard Step 5
// (Voicemail + Live B), Settings State B (Live + Voicemail), and the State C
// Connect section.
//
// This component is presentational: it renders state passed in via `state`
// and surfaces intent via callbacks. The polling that drives idle ->
// listening -> verified|failed lives with the consumer (today a 2s poll of
// /forwarding-status; hand-off §2.3 + §4.4).

type ForwardingCodeCardState = 'idle' | 'listening' | 'verified' | 'failed'

type ForwardingCodeCardProps = {
  carrier: Carrier
  path: CallPath
  tenantPhone: string
  tenantName: string
  fonoNumber: string
  state: ForwardingCodeCardState
  onDialed?: () => void
  onRetry?: () => void
  onCarrierChange?: () => void
  // Optional detail rendered inside the verified banner, e.g.
  // "A call from (404) 555-0182 just reached us 13 seconds ago."
  verifiedDetail?: ReactNode
}

export function ForwardingCodeCard({
  carrier,
  path,
  tenantPhone,
  tenantName,
  fonoNumber,
  state,
  onDialed,
  onRetry,
  onCarrierChange,
  verifiedDetail,
}: ForwardingCodeCardProps) {
  const code = forwardingCodeFor(carrier, path, fonoNumber)
  const dialHeader =
    path === 'live'
      ? 'Forward all your calls to Fono.'
      : 'Forward missed calls to Fono.'

  return (
    <div>
      <FromThisPhoneCallout tenantPhone={tenantPhone} tenantName={tenantName} />
      <DialThisCard code={code} header={dialHeader} fonoNumber={fonoNumber} />
      <CarrierDetectedLine
        carrier={CARRIER_LABELS[carrier]}
        onChangeCarrier={onCarrierChange}
      />

      {state === 'idle' && (
        <>
          <p
            style={{
              fontSize: 13,
              color: tokens.body,
              margin: '20px 0 12px',
              lineHeight: 1.55,
            }}
          >
            After you dial it, click below. We&rsquo;ll watch for the first call
            that comes our way.
          </p>
          <SettingsButton
            size="lg"
            onClick={onDialed}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '15px 24px',
              fontSize: 15,
              borderRadius: 14,
            }}
          >
            I dialed the code
          </SettingsButton>
        </>
      )}

      {state === 'listening' && (
        <div style={{ marginTop: 18 }}>
          <PulseKeyframes />
          <Banner
            tone="amber"
            icon={<PulseDot />}
            title="Waiting for your first call"
          >
            To test, call your restaurant from any other phone and let it ring
            until voicemail. We&rsquo;ll pick up.
          </Banner>
        </div>
      )}

      {state === 'verified' && (
        <div style={{ marginTop: 18 }}>
          <Banner tone="success" icon={<CheckIcon size={16} />} title="Forwarding verified">
            {verifiedDetail ?? "You're good to go."}
          </Banner>
        </div>
      )}

      {state === 'failed' && (
        <div style={{ marginTop: 18 }}>
          <Banner
            tone="danger"
            title="Didn't connect"
            action={
              <SettingsButton variant="outline" size="sm" onClick={onRetry}>
                Try again
              </SettingsButton>
            }
          >
            We didn&rsquo;t see a forwarded call in the last few minutes. Check
            your carrier code and try again.
          </Banner>
        </div>
      )}
    </div>
  )
}

function PulseDot() {
  return (
    <span
      className="fono-pulse"
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: tokens.amber,
      }}
    />
  )
}

// Scoped pulse keyframes (mirrors the design's .vs-pulse). Honors
// prefers-reduced-motion by resolving to a static dot.
function PulseKeyframes() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
        @keyframes fono-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.35); opacity: 0.55; }
        }
        .fono-pulse { animation: fono-pulse 1.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .fono-pulse { animation: none; }
        }
      `,
      }}
    />
  )
}
