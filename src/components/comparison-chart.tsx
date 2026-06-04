'use client'

import type { ReactNode } from 'react'
import { tokens, CheckIcon } from '@/components/settings-primitives'

// "What each path gives you" comparison table. Used by the wizard Step 4,
// Settings -> Calls State A hero, and State C "How Fono Answers".
//
// Pure-presentational per CD hand-off §2.1: the chart never carries the
// path-selection UI (that lives in the PathCards above it). currentPick
// highlights the matching column with the Terra tint and a "Current pick"
// label; null means nothing is picked yet (State A before a choice).
//
// Recommended-badge rule (locked M1, hand-off §2.2): the "Recommended"
// nudge appears on Fono Live only, and only when Live is not the current
// pick. The source mockup briefly placed it on the Voicemail column; the
// hand-off is the tiebreaker and puts it on Live.

type ComparisonChartProps = {
  currentPick: 'live' | 'voicemail' | null
  // Wizard-only FOMO line beneath the table. State A puts the line in the
  // hero copy instead; State C omits it (it would read as insulting once
  // the owner has already chosen). Default false.
  showFomoLine?: boolean
  // Reserved for deeply-embedded read-only contexts; currently unused but
  // part of the documented prop contract (§2.1).
  hideAnimations?: boolean
}

const SHARED_ROWS = [
  'Never miss a customer',
  'Smart categorized voicemails',
  'Auto SMS reply to missed callers',
  'Hours-aware greeting + SMS',
]

const LIVE_ONLY_ROWS = [
  'Every conversation recorded',
  'Full call analytics dashboard',
  'Replay any conversation',
  'Compliance + audit trail',
]

const LIVE_TINT = 'rgba(224,96,42,0.04)'
const LIVE_TINT_STRONG = 'rgba(224,96,42,0.08)'

export function ComparisonChart({
  currentPick,
  showFomoLine = false,
}: ComparisonChartProps) {
  const liveOn = currentPick === 'live'
  const vmOn = currentPick === 'voicemail'

  return (
    <div>
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${tokens.rule}`,
          background: '#fff',
          overflow: 'hidden',
        }}
      >
        {/* Header band */}
        <div style={{ display: 'flex', alignItems: 'stretch', background: '#fff' }}>
          <div
            style={{
              flex: '0 0 50%',
              padding: '12px 16px',
              fontSize: 11,
              fontWeight: 700,
              color: tokens.muted,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'flex-end',
            }}
          >
            What each path gives you
          </div>
          <HeaderCell label="Fono Live" on={liveOn} recommended={!liveOn} />
          <HeaderCell label="Fono Voicemail" on={vmOn} recommended={false} />
        </div>

        {SHARED_ROWS.map((label) => (
          <Row key={label} label={label} live vm liveOn={liveOn} vmOn={vmOn} />
        ))}
        {LIVE_ONLY_ROWS.map((label) => (
          <Row key={label} label={label} live vm={false} liveOn={liveOn} vmOn={vmOn} />
        ))}

        {/* Setup footer row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            borderTop: `2px solid ${tokens.rule}`,
            background: tokens.fieldBg,
          }}
        >
          <div
            style={{
              flex: '0 0 50%',
              padding: '12px 16px',
              fontSize: 11,
              fontWeight: 700,
              color: tokens.muted,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Setup
          </div>
          <SetupCell value="2 phones" on={liveOn} />
          <SetupCell value="1 phone" on={vmOn} />
        </div>
      </div>

      {showFomoLine && (
        <p
          style={{
            fontSize: 13.5,
            color: tokens.body,
            margin: '16px 4px 0',
            lineHeight: 1.55,
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Most owners pick{' '}
          <strong style={{ fontStyle: 'normal', color: tokens.ink }}>Fono Live</strong>{' '}
          once they realize what they&rsquo;re missing in their conversations.
        </p>
      )}
    </div>
  )
}

function HeaderCell({
  label,
  on,
  recommended,
}: {
  label: string
  on: boolean
  recommended: boolean
}) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '12px 12px 14px',
        background: on ? LIVE_TINT_STRONG : 'transparent',
        borderLeft: `1px solid ${tokens.rule}`,
      }}
    >
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 800,
          color: tokens.ink,
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </div>
      {on && (
        <div style={pillStyle}>Current pick</div>
      )}
      {recommended && !on && (
        <div style={pillStyle}>&#9733; Recommended</div>
      )}
    </div>
  )
}

const pillStyle = {
  fontSize: 9.5,
  fontWeight: 700,
  color: tokens.terra,
  marginTop: 3,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
} as const

function Row({
  label,
  live,
  vm,
  liveOn,
  vmOn,
}: {
  label: string
  live: boolean
  vm: boolean
  liveOn: boolean
  vmOn: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', borderTop: `1px solid ${tokens.ruleSoft}` }}>
      <div
        style={{
          flex: '0 0 50%',
          padding: '11px 16px',
          fontSize: 13,
          color: tokens.body,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {label}
      </div>
      <ValueCell on={live} tinted={liveOn} />
      <ValueCell on={vm} tinted={vmOn} />
    </div>
  )
}

function ValueCell({ on, tinted }: { on: boolean; tinted: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '11px 16px',
        borderLeft: `1px solid ${tokens.rule}`,
        background: tinted ? LIVE_TINT : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {on ? (
        <span
          aria-label="included"
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: tokens.successBg,
            color: tokens.successFg,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CheckIcon />
        </span>
      ) : (
        <span aria-label="not included" style={{ color: tokens.hint, fontSize: 16, fontWeight: 700 }}>
          &mdash;
        </span>
      )}
    </div>
  )
}

function SetupCell({ value, on }: { value: ReactNode; on: boolean }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: 'center',
        padding: '12px 16px',
        borderLeft: `1px solid ${tokens.rule}`,
        fontSize: 13,
        fontWeight: 700,
        color: tokens.ink,
        background: on ? LIVE_TINT_STRONG : 'transparent',
      }}
    >
      {value}
    </div>
  )
}
