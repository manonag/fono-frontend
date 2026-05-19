'use client'

import type { ReactNode } from 'react'

type LockedPreviewProps = {
  title: string
  blurb?: string
  blockedReason: string
  children: ReactNode
}

// Wraps a Settings section that is conceptually present but not yet
// actionable (path not picked, forwarding not verified). Shows a faded
// preview of the underlying component with a small "Unlocks once..."
// pill centered on top. Numbering prefix intentionally not passed -
// locked sections suppress their displayed number per CD §1.2 + §5.5.
//
// Per CD §1.2:
//   inner opacity 0.45 + saturate(0.4) is what makes it read as a
//   cooler, slightly-faded preview without going all the way to grey.
//   pointer-events on the inner content are disabled and the children
//   wrapper is aria-hidden so screen readers announce only the blocked
//   reason, not the underlying form controls.
export function LockedPreview({
  title,
  blurb,
  blockedReason,
  children,
}: LockedPreviewProps) {
  return (
    <section>
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: blurb ? 8 : 12,
        }}
      >
        <h3
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#8B7355',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          {title}
        </h3>
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 8px',
            borderRadius: 5,
            background: '#F5F0EB',
            color: '#8B7355',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <LockIcon />
          Locked
        </span>
      </header>

      {blurb ? (
        <p
          style={{
            fontSize: 13,
            color: '#8B7355',
            lineHeight: 1.5,
            maxWidth: 640,
            marginBottom: 12,
          }}
        >
          {blurb}
        </p>
      ) : null}

      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            opacity: 0.45,
            filter: 'saturate(0.4)',
            pointerEvents: 'none',
          }}
        >
          {children}
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            padding: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background:
              'linear-gradient(180deg, rgba(253,240,232,0.35) 0%, rgba(253,240,232,0.85) 100%)',
          }}
        >
          <span
            role="status"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 16px',
              borderRadius: 999,
              background: '#fff',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 4px 14px -6px rgba(0,0,0,0.08)',
              fontSize: 12.5,
              fontWeight: 600,
              color: '#5C3D22',
            }}
          >
            <LockIcon size={14} />
            {blockedReason}
          </span>
        </div>
      </div>
    </section>
  )
}

function LockIcon({ size = 11 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
