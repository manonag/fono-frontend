'use client'

import { cn } from '@/lib/utils'

interface SidebarProps {
  activeItem?: string
  missedCount?: number
  onNavigate?: (item: string) => void
}

export function Sidebar({ activeItem = 'dashboard', missedCount = 0, onNavigate }: SidebarProps) {
  return (
    <aside
      className="hidden md:flex flex-col bg-white flex-shrink-0"
      style={{
        width: 260,
        borderRight: '1px solid rgba(0,0,0,0.05)',
        padding: '28px 0',
      }}
    >
      {/* Menu Section */}
      <SectionLabel>Menu</SectionLabel>
      <nav className="flex flex-col gap-1 px-4">
        <NavItem
          icon={<DashboardIcon />}
          label="Dashboard"
          active={activeItem === 'dashboard'}
          onClick={() => onNavigate?.('dashboard')}
        />
        <NavItem
          icon={<AnalyticsIcon />}
          label="Analytics"
          active={activeItem === 'analytics'}
          onClick={() => onNavigate?.('analytics')}
        />
        <NavItem
          icon={<PhoneIcon />}
          label="All Calls"
          active={activeItem === 'calls'}
          badge={missedCount > 0 ? missedCount : undefined}
          onClick={() => onNavigate?.('calls')}
        />
        <NavItem
          icon={<SettingsIcon />}
          label="Settings"
          active={activeItem === 'settings'}
          onClick={() => onNavigate?.('settings')}
        />
      </nav>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '8px 20px' }} />

      {/* Restaurants Section */}
      <SectionLabel>Restaurants</SectionLabel>
      <div className="flex flex-col gap-1 px-4">
        <RestaurantItem
          initials="SG"
          name="Spice Garden"
          location="Tracy, CA"
          active
        />
        <RestaurantItem
          initials="BC"
          name="Bawarchi Cafe"
          location="Fremont, CA"
          active={false}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.05)', margin: '8px 20px' }} />

      {/* Bottom items */}
      <div className="flex flex-col gap-1 px-4 mt-2">
        <BottomItem icon={<InfoIcon />} label="Help & Support" />
        <BottomItem icon={<LogoutIcon />} label="Log Out" />
      </div>
    </aside>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="px-7 mb-2 mt-4 first:mt-0"
      style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: '#B0A090',
      }}
    >
      {children}
    </p>
  )
}

function NavItem({ icon, label, active, badge, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; badge?: number; onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full text-left transition-colors',
        active ? 'bg-cream' : 'hover:bg-cream/60'
      )}
      style={{
        height: 44,
        padding: '11px 12px',
        borderRadius: 12,
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: active ? 'rgba(224,96,42,0.1)' : 'rgba(0,0,0,0.03)',
        }}
      >
        <span style={{ color: active ? '#E0602A' : '#5C3D22' }}>{icon}</span>
      </div>
      <span
        style={{
          fontSize: 14,
          fontWeight: active ? 600 : 500,
          color: active ? '#E0602A' : '#5C3D22',
        }}
      >
        {label}
      </span>
      {badge !== undefined && (
        <span
          className="ml-auto flex items-center justify-center text-white rounded-full"
          style={{
            backgroundColor: '#EF4444',
            fontSize: 10,
            fontWeight: 700,
            minWidth: 22,
            height: 20,
            padding: '0 6px',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

function RestaurantItem({ initials, name, location, active }: {
  initials: string; name: string; location: string; active: boolean
}) {
  return (
    <button
      className={cn(
        'flex items-center gap-3 w-full text-left transition-colors',
        active ? 'bg-cream' : 'hover:bg-cream/60'
      )}
      style={{
        padding: '8px 12px',
        borderRadius: 12,
      }}
    >
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: active ? '#E0602A' : '#E8E0D8',
          color: active ? '#fff' : '#8B7355',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: 600, color: '#1E0E00' }} className="truncate">{name}</p>
        <p style={{ fontSize: 11, color: '#8B7355' }}>{location}</p>
      </div>
      {active && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E0602A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
}

function BottomItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      className="flex items-center gap-3 w-full text-left hover:bg-cream/60 transition-colors"
      style={{
        padding: '8px 12px',
        borderRadius: 12,
        color: '#8B7355',
        fontSize: 13,
      }}
    >
      {icon}
      {label}
    </button>
  )
}

// ── SVG Icons (24×24, stroke, no fill, 1.8 strokeWidth) ──

function DashboardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="13" width="4" height="8" rx="1" />
      <rect x="10" y="9" width="4" height="12" rx="1" />
      <rect x="17" y="5" width="4" height="16" rx="1" />
    </svg>
  )
}

function AnalyticsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3v18h18" />
      <path d="M7 16l4-6 4 4 6-8" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
