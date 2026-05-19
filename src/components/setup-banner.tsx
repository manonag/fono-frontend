'use client'

import { useRouter } from 'next/navigation'
import { useTenantSetupState, type SetupVariant } from '@/hooks/use-tenant-setup-state'

type CopyBlock = { strong: string; detail: string; cta: string }

const COPY: Record<SetupVariant, CopyBlock> = {
  'no-path': {
    strong: 'Finish setting up your calls.',
    detail: 'Pick how Fono should answer incoming calls.',
    cta: 'Set up',
  },
  'picked-live': {
    strong: 'Almost there.',
    detail: 'Dial your carrier forwarding code to activate Fono Live.',
    cta: 'Finish setup',
  },
  'picked-voicemail': {
    strong: 'Almost there.',
    detail: 'Dial your carrier forwarding code to activate Fono Voicemail.',
    cta: 'Finish setup',
  },
}

// Persistent amber bar that surfaces incomplete setup state on every page
// the banner is mounted into. Self-renders nothing when (a) no tenant
// settings have loaded yet, or (b) the current tenant's forwarding is
// verified, so it is safe to mount globally next to ImpersonationBanner.
// Three copy variants are driven by tenant.call_setup_path:
//   null         -> 'no-path'         V1 banner
//   'live'       -> 'picked-live'     V2A banner
//   'voicemail'  -> 'picked-voicemail' V2B banner
// Per CD hand-off §1.1 + §5.4 (architect override that the banner shows
// on Settings -> Calls itself, contradicting the original spec).
export function SetupBanner() {
  const router = useRouter()
  const { loaded, variant, verified } = useTenantSetupState()

  if (!loaded || verified || !variant) return null

  const copy = COPY[variant]

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="setup-banner"
      data-variant={variant}
      style={{
        margin: '12px 18px 0',
        padding: '12px 18px',
        borderRadius: 12,
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.20)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'rgba(245,158,11,0.18)',
          color: '#92400E',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 13.5,
          color: '#92400E',
          lineHeight: 1.5,
        }}
      >
        <span style={{ fontWeight: 700 }}>{copy.strong}</span>
        <span style={{ marginLeft: 6, opacity: 0.85 }}>{copy.detail}</span>
      </div>

      <button
        type="button"
        onClick={() => router.push('/settings?tab=call-setup')}
        style={{
          padding: '7px 14px',
          fontSize: 13,
          fontWeight: 700,
          borderRadius: 12,
          background: '#92400E',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {copy.cta} &rarr;
      </button>
    </div>
  )
}
