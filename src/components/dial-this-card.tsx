'use client'

import { useState } from 'react'
import { tokens, MONO, SettingsButton } from '@/components/settings-primitives'

// Dark "DIAL THIS" card holding the carrier forwarding code in monospace,
// with a Copy button. Used wherever a dial code is surfaced (wizard Step 5,
// State B, State C Connect).
//
// `code` may be null for the "other" carrier (forwardingCodeFor returns
// null) — in that case we render the generic provider instruction instead
// of a concrete dial string, using `fonoNumber` for the number to enter.

type DialThisCardProps = {
  code: string | null
  header?: string
  fonoNumber?: string
}

export function DialThisCard({ code, header, fonoNumber }: DialThisCardProps) {
  const [copied, setCopied] = useState(false)

  const onCopy = () => {
    if (!code) return
    void navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      },
      () => {
        /* clipboard unavailable; no-op */
      },
    )
  }

  return (
    <div
      style={{
        borderRadius: 12,
        background: tokens.ink,
        color: '#FFE9D9',
        padding: '18px 20px',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,233,217,0.55)',
          marginBottom: 4,
          fontFamily: MONO,
        }}
      >
        Dial this
      </div>
      {header && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'rgba(255,233,217,0.85)',
            marginBottom: 10,
          }}
        >
          {header}
        </div>
      )}

      {code ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <span
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '0.04em',
              fontFamily: MONO,
            }}
          >
            {code}
          </span>
          <SettingsButton
            variant="outline"
            size="sm"
            onClick={onCopy}
            style={{
              background: 'rgba(255,255,255,0.10)',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.20)',
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </SettingsButton>
        </div>
      ) : (
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(255,233,217,0.9)' }}>
          Dial the forwarding code your provider gave you, then enter{' '}
          <span style={{ fontFamily: MONO, fontWeight: 700, color: '#fff' }}>
            {fonoNumber ?? 'your Fono number'}
          </span>{' '}
          when prompted.
        </div>
      )}
    </div>
  )
}
