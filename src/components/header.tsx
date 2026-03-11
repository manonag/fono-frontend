'use client'

import FonoLogo from './logo'
import { PulsingCircle } from './pulsing-circle'
import { cn } from '@/lib/utils'

interface HeaderProps {
  variant: 'dashboard' | 'kiosk' | 'signup'
  restaurantName?: string
  restaurantLocation?: string
  connected?: boolean
  isMobile?: boolean
}

export function Header({ variant, restaurantName, restaurantLocation = 'Tracy, CA', connected = false, isMobile = false }: HeaderProps) {
  if (variant === 'signup') {
    return (
      <header className="bg-cream py-4 px-6 flex justify-center">
        <FonoLogo size={32} textColor="#D4652C" mode="light" />
      </header>
    )
  }

  if (variant === 'kiosk') {
    return (
      <header className="bg-ink px-4 sm:px-6 flex items-center justify-between" style={{ height: 56 }}>
        <div className="flex items-center gap-3">
          <FonoLogo size={24} textColor="#FDF0E8" mode="light" />
          {restaurantName && (
            <>
              <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }} />
              <span className="text-cream/90" style={{ fontSize: 14, fontWeight: 500 }}>{restaurantName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <KioskClock />
          <LiveBadge connected={connected} />
        </div>
      </header>
    )
  }

  // Dashboard — Mobile header
  if (isMobile) {
    return (
      <header
        className="bg-white px-4 flex items-center justify-between sticky top-0 z-30"
        style={{ height: 52, borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      >
        <div className="flex items-center gap-3">
          <PulsingCircle size={28} color="#E0602A" />
          <div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1E0E00', lineHeight: 1.2 }}>
              {restaurantName || 'Spice Garden'}
            </p>
            <div className="flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span style={{ fontSize: 12, color: '#8B7355' }}>{restaurantLocation}</span>
              <span style={{ fontSize: 10, color: '#B0A090', marginLeft: 4 }}>powered by fono</span>
            </div>
          </div>
        </div>
        <LiveBadge connected={connected} compact />
      </header>
    )
  }

  // Dashboard — Desktop header
  return (
    <header
      className="items-center justify-between px-6 hidden md:flex"
      style={{
        height: 56,
        backgroundColor: '#C84E20',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex items-center gap-3">
        <FonoLogo size={26} textColor="#fff" mode="orange" />
        {restaurantName && (
          <>
            <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)' }} />
            <span className="text-white" style={{ fontSize: 15, fontWeight: 600 }}>
              {restaurantName}
            </span>
          </>
        )}
      </div>
      <LiveBadge connected={connected} />
    </header>
  )
}

function LiveBadge({ connected, compact }: { connected: boolean; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span
          className={cn('w-2 h-2 rounded-full', connected ? 'bg-green-500 live-dot' : 'bg-gray-400')}
        />
        <span style={{ fontSize: 12, fontWeight: 500, color: connected ? '#22C55E' : '#8B7355' }}>
          {connected ? 'Live' : 'Offline'}
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1.5"
      style={{
        padding: '4px 10px',
        borderRadius: 9999,
        backgroundColor: connected ? 'rgba(34,197,94,0.15)' : 'rgba(0,0,0,0.1)',
      }}
    >
      <span
        className={cn('w-2 h-2 rounded-full', connected ? 'bg-green-400 live-dot' : 'bg-gray-400')}
      />
      <span style={{ fontSize: 12, fontWeight: 500, color: connected ? '#22C55E' : 'rgba(255,255,255,0.5)' }}>
        {connected ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}

function KioskClock() {
  const now = new Date()
  return (
    <span className="text-cream/70 text-sm font-medium tabular-nums">
      {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    </span>
  )
}
