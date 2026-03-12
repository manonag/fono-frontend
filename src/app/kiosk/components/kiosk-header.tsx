'use client'

import { useState, useEffect } from 'react'
import FonoLogo from '@/components/logo'
import { ThemeToggle } from './theme-toggle'
import { useRestaurant } from '@/lib/restaurant-context'

interface KioskHeaderProps {
  connected: boolean
  dark: boolean
  onToggleTheme: () => void
}

export function KioskHeader({ connected, dark, onToggleTheme }: KioskHeaderProps) {
  const { current } = useRestaurant()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const bg = dark ? '#111111' : '#FFFFFF'
  const border = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textPrimary = dark ? '#FDF0E8' : '#1E0E00'
  const textSecondary = dark ? 'rgba(253,240,232,0.5)' : '#8B7355'

  return (
    <header
      style={{
        height: 60,
        backgroundColor: bg,
        borderBottom: `1px solid ${border}`,
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <FonoLogo size={24} textColor={dark ? '#FDF0E8' : '#D4652C'} mode={dark ? 'light' : 'light'} />
        <div style={{ width: 1, height: 24, background: border }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: textPrimary }}>{current.name}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: textSecondary, fontVariantNumeric: 'tabular-nums' }}>
          {time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
        </span>

        {/* Live / Offline indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 9999,
            backgroundColor: connected ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          }}
        >
          <span
            className={connected ? 'live-dot' : ''}
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: connected ? '#22C55E' : '#EF4444',
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 600, color: connected ? '#22C55E' : '#EF4444' }}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        <ThemeToggle dark={dark} onToggle={onToggleTheme} />
      </div>
    </header>
  )
}
