'use client'

interface StatsBarProps {
  totalCalls: number
  missedCount: number
  recoveredCount: number
  breachedCount: number
  dark: boolean
}

export function StatsBar({ totalCalls, missedCount, recoveredCount, breachedCount, dark }: StatsBarProps) {
  const bg = dark ? '#111111' : '#FFFFFF'
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textColor = dark ? 'rgba(253,240,232,0.5)' : '#8B7355'

  const parts = [
    { text: `${totalCalls} total today`, color: textColor },
    { text: `${missedCount} missed`, color: textColor },
    { text: `${recoveredCount} recovered`, color: textColor },
    { text: `${breachedCount} breached`, color: breachedCount > 0 ? '#EF4444' : textColor },
  ]

  return (
    <div
      style={{
        height: 44,
        backgroundColor: bg,
        borderTop: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {parts.map((part, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
          {i > 0 && (
            <span style={{ margin: '0 8px', color: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }}>·</span>
          )}
          <span style={{ color: part.color, fontVariantNumeric: 'tabular-nums' }}>{part.text}</span>
        </span>
      ))}
    </div>
  )
}
