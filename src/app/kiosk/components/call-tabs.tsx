'use client'

export type KioskTab = 'missed' | 'recovered' | 'ignored'

interface CallTabsProps {
  active: KioskTab
  onTabChange: (tab: KioskTab) => void
  missedCount: number
  recoveredCount: number
  ignoredCount: number
  breachedCount: number
  dark: boolean
}

export function CallTabs({ active, onTabChange, missedCount, recoveredCount, ignoredCount, breachedCount, dark }: CallTabsProps) {
  const bg = dark ? '#111111' : '#FFFFFF'
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  const tabs: { key: KioskTab; label: string; count: number; badgeColor: string }[] = [
    { key: 'missed', label: 'MISSED', count: missedCount, badgeColor: '#EF4444' },
    { key: 'recovered', label: 'RECOVERED', count: recoveredCount, badgeColor: '#22C55E' },
    { key: 'ignored', label: 'IGNORED', count: ignoredCount, badgeColor: dark ? 'rgba(253,240,232,0.3)' : '#8B7355' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: bg,
        borderBottom: `1px solid ${border}`,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key
        const textColor = isActive
          ? '#E8731A'
          : dark ? 'rgba(253,240,232,0.45)' : '#8B7355'

        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            style={{
              flex: 1,
              padding: '14px 0',
              border: 'none',
              borderBottom: isActive ? '2.5px solid #E8731A' : '2.5px solid transparent',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: textColor, letterSpacing: '0.05em' }}>
              {tab.label}
            </span>
            {tab.count > 0 && (
              <span
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: tab.badgeColor,
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 6px',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}

      {/* Breached indicator */}
      {breachedCount > 0 && (
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              animation: 'sla-dot-pulse 1.2s ease-in-out infinite',
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#EF4444' }}>
            {breachedCount} breached
          </span>
        </div>
      )}
    </div>
  )
}
