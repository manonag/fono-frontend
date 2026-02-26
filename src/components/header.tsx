'use client'

import { FonoLogo } from './logo'
import { cn } from '@/lib/utils'

interface HeaderProps {
  variant: 'dashboard' | 'kiosk' | 'signup'
  restaurantName?: string
  connected?: boolean
}

export function Header({ variant, restaurantName, connected = false }: HeaderProps) {
  if (variant === 'signup') {
    return (
      <header className="bg-cream py-4 px-6 flex justify-center">
        <FonoLogo size={32} textColor="#E0602A" circleColor="#E0602A" pulseColor="#E0602A" />
      </header>
    )
  }

  const isDashboard = variant === 'dashboard'

  return (
    <header
      className={cn(
        'px-4 sm:px-6 py-3 flex items-center justify-between',
        isDashboard ? 'bg-terra-dark' : 'bg-ink'
      )}
    >
      <div className="flex items-center gap-3">
        {isDashboard ? (
          <FonoLogo
            size={24}
            textColor="white"
            circleColor="rgba(255,255,255,0.7)"
            pulseColor="rgba(255,255,255,0.5)"
          />
        ) : (
          <FonoLogo
            size={24}
            textColor="#FDF0E8"
            circleColor="#E0602A"
            pulseColor="#E0602A"
          />
        )}
        {restaurantName && (
          <>
            <div className={cn('w-px h-5', isDashboard ? 'bg-white/30' : 'bg-white/20')} />
            <span className={cn('text-sm font-medium', isDashboard ? 'text-white/90' : 'text-cream/90')}>
              {restaurantName}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {isDashboard && (
          <span className="text-white/70 text-sm hidden md:inline">
            {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}
        {variant === 'kiosk' && (
          <KioskClock />
        )}
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'w-2 h-2 rounded-full',
            connected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          )} />
          <span className={cn(
            'text-xs font-medium',
            isDashboard ? 'text-white/70' : 'text-cream/70'
          )}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>
        {isDashboard && (
          <button
            className="text-white/70 hover:text-white transition-colors hidden sm:block"
            aria-label="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}

function KioskClock() {
  // Simple static render; on client it updates via useEffect
  const now = new Date()
  return (
    <span className="text-cream/70 text-sm font-medium tabular-nums">
      {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
    </span>
  )
}
