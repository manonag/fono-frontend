'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  missedCount?: number
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: 'dashboard' },
  { href: '/calls', label: 'Calls', icon: 'phone' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
  { href: '/analytics', label: 'Analytics', icon: 'analytics' },
] as const

export function MobileNav({ missedCount = 0 }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white flex items-center justify-around z-40 md:hidden"
      style={{
        height: 64,
        borderTop: '1px solid rgba(0,0,0,0.06)',
        paddingBottom: 8,
      }}
    >
      {NAV_ITEMS.map((item) => (
        <div key={item.href} className="relative">
          <Link
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 justify-center',
              pathname === item.href ? 'text-terra' : 'text-[#B0A090]'
            )}
            style={{ height: 44, minWidth: 48 }}
          >
            <NavIcon name={item.icon} />
            <span style={{ fontSize: 10, fontWeight: 500 }}>{item.label}</span>
          </Link>
          {item.icon === 'phone' && missedCount > 0 && (
            <span
              className="absolute flex items-center justify-center bg-red-500 text-white rounded-full"
              style={{
                top: 0,
                right: -2,
                width: 18,
                height: 18,
                fontSize: 10,
                fontWeight: 700,
                border: '2px solid white',
              }}
            >
              {missedCount > 9 ? '9+' : missedCount}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}

function NavIcon({ name }: { name: string }) {
  switch (name) {
    case 'dashboard':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="13" width="4" height="8" rx="1" />
          <rect x="10" y="9" width="4" height="12" rx="1" />
          <rect x="17" y="5" width="4" height="16" rx="1" />
        </svg>
      )
    case 'phone':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
        </svg>
      )
    case 'settings':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </svg>
      )
    case 'analytics':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-6 4 4 6-8" />
        </svg>
      )
    default:
      return null
  }
}
