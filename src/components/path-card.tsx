'use client'

import { cn } from '@/lib/utils'

type PathCardProps = {
  path: 'live' | 'voicemail'
  pick: boolean
  recommended?: boolean
  onSelect?: () => void
  disabled?: boolean
}

// One of the two selectable cards in the path-picker hero (CD §2.2).
// Used by Settings -> Calls State A and by the wizard's Step 4. The
// chart-style comparison table that sometimes appears beneath the
// pair is a separate <ComparisonChart> per CD §2.1 (not shipped here;
// the hero pair on its own is enough for State A's first action).
//
// Recommended-badge rule (locked from M1): the badge appears only on
// the unselected card, only on Fono Live. The selected card never
// shows the badge regardless of which path it is.
export function PathCard({
  path,
  pick,
  recommended = false,
  onSelect,
  disabled = false,
}: PathCardProps) {
  const isLive = path === 'live'
  const title = isLive ? 'Fono Live' : 'Fono Voicemail'
  const tagline = isLive
    ? 'Bridges every call to your staff.'
    : 'Captures missed calls and routes by intent.'

  const showRecommendedBadge = recommended && !pick && isLive

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={pick}
      data-testid={`path-card-${path}`}
      className={cn(
        'text-left transition-colors',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
      style={{
        flex: 1,
        position: 'relative',
        padding: '18px 20px',
        borderRadius: 16,
        background: pick ? 'rgba(224,96,42,0.05)' : '#fff',
        border: pick
          ? '1.5px solid #E0602A'
          : '1px solid rgba(0,0,0,0.08)',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 6,
        }}
      >
        <Radio active={pick} disabled={disabled} />
        <h4
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 800,
            color: '#1E0E00',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h4>
        {showRecommendedBadge ? (
          <span
            aria-hidden="true"
            style={{
              marginLeft: 'auto',
              padding: '3px 8px',
              borderRadius: 5,
              background: 'rgba(224,96,42,0.10)',
              color: '#C84E20',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            &#9733; Recommended
          </span>
        ) : null}
      </header>
      <p
        style={{
          margin: 0,
          marginLeft: 30,
          fontSize: 13,
          color: '#5C3D22',
          lineHeight: 1.5,
        }}
      >
        {tagline}
      </p>
    </button>
  )
}

function Radio({ active, disabled }: { active: boolean; disabled: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        flexShrink: 0,
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: `1.5px solid ${active ? '#E0602A' : 'rgba(0,0,0,0.20)'}`,
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {active ? (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#E0602A',
          }}
        />
      ) : null}
    </span>
  )
}
