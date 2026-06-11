'use client'

import { useState, useEffect, useCallback, useRef, Suspense, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { UserMenu } from '@/components/user-menu'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useFonoToken } from '@/hooks/use-fono-token'
import { useTenantSetupState } from '@/hooks/use-tenant-setup-state'
import { cn, formatCallTime } from '@/lib/utils'
import { config } from '@/lib/config'
import { LockedPreview } from '@/components/locked-preview'
import { PathCard } from '@/components/path-card'
import { ComparisonChart } from '@/components/comparison-chart'
import { ForwardingCodeCard } from '@/components/forwarding-code-card'
import { HowFonoAnswersCard } from '@/components/how-fono-answers-card'
import { CategoriesChipCard, type CategoryChipModel } from '@/components/categories-chip-card'
import { NotificationsMiniCard } from '@/components/notifications-mini-card'
import { VoicemailCaptureCard } from '@/components/voicemail-capture-card'
import { SlaTrackingCard } from '@/components/sla-tracking-card'
import { CallRoutingCard } from '@/components/call-routing-card'
import { FromThisPhoneCallout } from '@/components/from-this-phone-callout'
import { SettingsCard as VsCard, SettingsButton, Banner, FieldLabel, HelperText, tokens } from '@/components/settings-primitives'
import { type Carrier } from '@/lib/forwarding-codes'
import { displayNumberFor, type SectionId } from '@/lib/section-numbering'
import { useRestaurant } from '@/lib/restaurant-context'
import { useImpersonation } from '@/lib/impersonation'
import { MOCK_PLANS, MOCK_USAGE, MOCK_INVOICES, FEATURE_NAMES } from '@/lib/mock-data'
import type { Plan } from '@/lib/mock-data'

// v3.3 IA: three tabs (Restaurant / Calls / Account). The pre-v3.3 surface
// had six (Restaurant, Call Setup, Notifications, Call Forwarding, Greeting,
// Plan). FE-2 collapses to three; per the "collapse now, stash orphans"
// call, Notifications + Greeting are temporarily reachable inside Calls and
// Plan inside Account until FE-3 (Calls State C sections) and FE-6 (Account)
// give them their permanent homes.
type SettingsTab = 'restaurant' | 'calls' | 'account'
const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'calls', label: 'Calls' },
  { id: 'account', label: 'Account' },
]

// Map legacy ?tab= values (and the old setup-banner deep link) onto the new
// three-tab IA so existing links don't 404 into the default tab silently.
const LEGACY_TAB_ALIAS: Record<string, SettingsTab> = {
  'call-setup': 'calls',
  forwarding: 'calls',
  notifications: 'calls',
  greeting: 'calls',
  plan: 'account',
}

function resolveTab(param: string | null): SettingsTab {
  if (!param) return 'restaurant'
  if (TABS.some((t) => t.id === param)) return param as SettingsTab
  return LEGACY_TAB_ALIAS[param] ?? 'restaurant'
}

function SettingsContent() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<SettingsTab>(resolveTab(tabParam))
  const { current, isAll } = useRestaurant()
  const restaurantName = isAll ? 'All Restaurants' : current.name

  const content = (
    <div style={{ maxWidth: 720, padding: isMobile ? '20px 16px 80px' : '36px 40px' }}>
      <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#1E0E00', marginBottom: 20 }}>
        Settings
      </h1>

      {/* Tab Bar */}
      <div className="flex" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 24, gap: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="transition-colors"
            style={{
              padding: '12px 20px',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? '#E0602A' : '#8B7355',
              borderBottom: activeTab === tab.id ? '2px solid #E0602A' : '2px solid transparent',
              cursor: 'pointer',
              background: 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'restaurant' && <RestaurantTab />}
      {activeTab === 'calls' && <CallsTab />}
      {activeTab === 'account' && <AccountTab isMobile={isMobile} />}
    </div>
  )

  if (isMobile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header variant="dashboard" restaurantName={restaurantName} connected={false} isMobile userMenu={<UserMenu />} />
        <main className="flex-1">{content}</main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="dashboard" restaurantName={restaurantName} connected={false} userMenu={<UserMenu />} />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{content}</main>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab 2: Calls — v3.3 three-state dispatcher + stashed orphans
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// The Calls tab is the v3.3 state machine (State A path picker / State B
// finish-setup / State C configured). State C now renders Greeting and
// Notifications as first-class sections, so the temporary "More call
// settings" drawer is gone (FE-3).
function CallsTab() {
  return <CallsSettings />
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab 1: Restaurant — read-only Google mirror + Re-sync (FE-5 / T-248)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type RestaurantProfile = {
  name: string
  phone: string
  address: string | null
  googleProfileUrl: string | null
  placeId: string | null
  weekdayText: string[] | null
  lastSyncedAt: string | null
  orderUrl: string
}

function mapSettingsToProfile(data: Record<string, unknown>, fallbackName: string): RestaurantProfile {
  const bh = data.business_hours as { weekday_text?: unknown } | null | undefined
  const weekdayText =
    bh && Array.isArray(bh.weekday_text) && bh.weekday_text.every((t) => typeof t === 'string')
      ? (bh.weekday_text as string[])
      : null
  return {
    name: (data.name as string) || fallbackName,
    phone: (data.phone_number as string) || '',
    address: (data.address as string) || null,
    googleProfileUrl: (data.google_profile_url as string) || null,
    placeId: (data.google_place_id as string) || null,
    weekdayText,
    lastSyncedAt: (data.last_synced_at as string) || null,
    orderUrl: (data.online_order_url as string) || '',
  }
}

// Read-only Google Business Profile mirror + Re-sync + the one editable field
// (online ordering URL). Identity (name/phone/address/hours) is sourced from
// Google via T-248; to change it the owner edits Google and re-syncs.
function RestaurantTab() {
  const { current, isAll, tenantId } = useRestaurant()
  const token = useFonoToken()
  const imp = useImpersonation()
  const tid = isAll ? tenantId : current.id

  const [p, setP] = useState<RestaurantProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [orderUrl, setOrderUrl] = useState('')
  const [orderSaved, setOrderSaved] = useState(false)
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'failed'>('idle')
  const [justSynced, setJustSynced] = useState(false)

  useEffect(() => {
    if (!tid || tid === 'all' || !token) return
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/tenants/${tid}/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data) {
          const prof = mapSettingsToProfile(data, current.name)
          setP(prof)
          setOrderUrl(prof.orderUrl)
        }
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tid, token, current.name])

  const handleResync = async () => {
    if (imp.readOnly || !p?.placeId || !tid || tid === 'all' || !token) return
    setSyncState('syncing')
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}/resync-google`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        const prof = mapSettingsToProfile(data, current.name)
        setP(prof)
        setOrderUrl(prof.orderUrl)
        setSyncState('idle')
        setJustSynced(true)
        setTimeout(() => setJustSynced(false), 4000)
        return
      }
      setSyncState('failed')
    } catch {
      setSyncState('failed')
    }
  }

  const handleSaveOrderUrl = async () => {
    if (imp.readOnly || !p || !tid || tid === 'all' || !token) return
    if (orderUrl === p.orderUrl) return
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ online_order_url: orderUrl }),
      })
      if (res.ok) {
        setP({ ...p, orderUrl })
        setOrderSaved(true)
        setTimeout(() => setOrderSaved(false), 2000)
      }
    } catch {
      /* ignore */
    }
  }

  if (loading || !p) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 60 }}>
        <div className="animate-spin" style={{ width: 24, height: 24, border: '2.5px solid rgba(0,0,0,0.08)', borderTopColor: '#E0602A', borderRadius: '50%' }} />
      </div>
    )
  }

  const linked = !!p.placeId
  const lastSynced = p.lastSyncedAt ? formatCallTime(p.lastSyncedAt, null).combined : null

  return (
    <div className="space-y-6">
      <VsCard
        title="Restaurant info"
        badge="Mirrored from Google"
        action={
          linked ? (
            <SettingsButton variant="outline" size="sm" onClick={handleResync} disabled={imp.readOnly || syncState === 'syncing'}>
              {syncState === 'syncing' ? 'Syncing…' : 'Re-sync from Google'}
            </SettingsButton>
          ) : undefined
        }
      >
        <div style={{ marginBottom: 18 }}>
          {!linked ? (
            <Banner tone="neutral" title="Not connected to Google yet">
              Your restaurant details mirror your Google Business Profile, which is linked during setup. Once connected, Re-sync pulls the latest.
            </Banner>
          ) : syncState === 'failed' ? (
            <Banner
              tone="amber"
              title="Couldn't refresh from Google"
              action={
                <SettingsButton variant="outline" size="sm" onClick={handleResync}>
                  Try again
                </SettingsButton>
              }
            >
              We couldn&rsquo;t reach Google just now. Your last good values are still in effect.
            </Banner>
          ) : justSynced ? (
            <Banner tone="success" title="Synced from Google">
              Latest name, phone, address, and hours pulled in.
            </Banner>
          ) : (
            <Banner tone="neutral" title={lastSynced ? `Last synced ${lastSynced}` : 'Synced from Google'}>
              Updated your Google profile? Click Re-sync to pull the latest. We don&rsquo;t auto-sync in v1.
            </Banner>
          )}
        </div>

        <GoogleField label="Restaurant name" value={p.name} />
        <GoogleField label="Phone number" value={formatPhone(p.phone)} mono />
        <GoogleField label="Address" value={p.address ?? 'Not synced yet'} />
        <GoogleField
          label="Google profile"
          value={
            p.googleProfileUrl ? (
              <a href={p.googleProfileUrl} target="_blank" rel="noreferrer" style={{ color: tokens.terra, textDecoration: 'none', fontWeight: 600 }}>
                View on Google &#8599;
              </a>
            ) : (
              '—'
            )
          }
        />
        <GoogleHours weekdayText={p.weekdayText} />

        <div style={{ paddingTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <FieldLabel style={{ margin: 0 }}>Online ordering URL</FieldLabel>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: tokens.terra, padding: '2px 7px', borderRadius: 5, background: 'rgba(224,96,42,0.08)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              {orderSaved ? 'Saved ✓' : 'Editable'}
            </span>
          </div>
          <input
            type="text"
            value={orderUrl}
            onChange={(e) => setOrderUrl(e.target.value)}
            onBlur={handleSaveOrderUrl}
            placeholder="https://your-restaurant.com/order"
            readOnly={imp.readOnly}
            className="w-full bg-white focus:outline-none read-only:bg-gray-50 read-only:cursor-not-allowed"
            style={{ padding: '11px 14px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 14, fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
            onFocus={(e) => { if (!imp.readOnly) e.currentTarget.style.borderColor = '#E0602A' }}
          />
          <HelperText>
            Optional. Appended to voicemail receipt SMS for Order-category calls so customers can self-serve. The only field on this tab you can edit.
          </HelperText>
        </div>
      </VsCard>

      <p style={{ fontSize: 12.5, color: tokens.muted, lineHeight: 1.55, padding: '0 4px' }}>
        Your restaurant details come from your Google Business Profile. To change your name, address, hours, or phone, update them on Google and click Re-sync.
      </p>
    </div>
  )
}

function GoogleField({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: tokens.muted, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{label}</span>
        <GoogleBadge />
      </div>
      <div style={{ fontSize: 14, color: tokens.ink, fontWeight: 500, fontFamily: mono ? "'JetBrains Mono', ui-monospace, monospace" : 'inherit' }}>{value}</div>
    </div>
  )
}

function GoogleHours({ weekdayText }: { weekdayText: string[] | null }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: tokens.muted, letterSpacing: '0.02em', textTransform: 'uppercase' }}>Business hours</span>
        <GoogleBadge />
      </div>
      {weekdayText && weekdayText.length ? (
        <div style={{ display: 'grid', rowGap: 3 }}>
          {weekdayText.map((line) => (
            <div key={line} style={{ fontSize: 12.5, color: tokens.body, fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>{line}</div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: tokens.hint }}>Not synced yet</div>
      )}
    </div>
  )
}

function GoogleBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 600, color: tokens.hint, padding: '2px 7px', borderRadius: 5, background: tokens.fieldBg }}>
      From Google
    </span>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab 3: Account — temporary shell around the existing Plan content
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// FE-6 builds the real Account tab (founding member + sign out + delete).
// Until then this keeps the existing Plan/billing content reachable.
function AccountTab({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="space-y-6">
      <div
        style={{
          borderRadius: 12,
          padding: '12px 16px',
          background: 'rgba(74,109,134,0.08)',
          border: '1px solid rgba(74,109,134,0.18)',
          fontSize: 13,
          color: '#26425A',
          lineHeight: 1.5,
        }}
      >
        The Account tab redesign is coming in a later update. Your plan and
        billing details are below in the meantime.
      </div>
      <PlanTab isMobile={isMobile} />
    </div>
  )
}



// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab 2: Call Setup (Path A/B)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatPhone(phone?: string | null): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

// v3.3 Settings -> Calls dispatcher. Renders one of three views based on
// the tenant's call_setup_path + call_forwarding_verified flags (CD §1
// state model; tracked in CHIRAN fact #319). State A is the new path
// picker; State B reuses the existing ForwardingTab content (forwarding
// code setup with carrier instructions); State C reuses the existing
// CallSetupTab body (callback number editor + path toggle). The B and C
// content is unchanged from pre-v3.3; this PR only adds the A entry
// point and the dispatch.
function CallsSettings() {
  const { loaded, variant, verified } = useTenantSetupState()

  if (!loaded) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 60 }}>
        <div
          className="animate-spin"
          style={{
            width: 24,
            height: 24,
            border: '2.5px solid rgba(0,0,0,0.08)',
            borderTopColor: '#E0602A',
            borderRadius: '50%',
          }}
        />
      </div>
    )
  }

  if (variant === 'no-path') return <CallsStateANoPath />
  if (!verified) return <ForwardingTab />
  return <CallsStateC />
}

function CallsStateANoPath() {
  const { current, isAll, tenantId } = useRestaurant()
  const token = useFonoToken()
  const imp = useImpersonation()
  const router = useRouter()
  const [submitting, setSubmitting] = useState<'live' | 'voicemail' | null>(null)
  const [error, setError] = useState<string>('')

  const tid = isAll ? tenantId : current.id

  const handlePick = async (path: 'live' | 'voicemail') => {
    if (imp.readOnly || !tid || tid === 'all' || !token) return
    setSubmitting(path)
    setError('')
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ call_setup_path: path }),
      })
      if (res.ok) {
        router.refresh()
        return
      }
      const detail = await res.json().catch(() => null)
      setError(detail?.detail || 'Could not save your choice. Please try again.')
    } catch {
      setError('Could not reach the server. Please try again.')
    }
    setSubmitting(null)
  }

  const busy = !!submitting || imp.readOnly

  return (
    <div className="space-y-6">
      {/* Hero — pick a path. The PathCards are the selector; the comparison
          chart and FOMO line carry the per-path detail (CD State A). */}
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid rgba(224,96,42,0.25)',
          boxShadow: '0 8px 28px -16px rgba(224,96,42,0.25)',
          padding: '28px 32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: '#E0602A',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              padding: '5px 10px',
              borderRadius: 5,
              background: 'rgba(224,96,42,0.10)',
              flex: '0 0 auto',
              marginTop: 2,
            }}
          >
            Start here
          </span>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1E0E00', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.2 }}>
              Set up your call path.
            </h2>
            <p style={{ fontSize: 14, color: '#5C3D22', margin: '6px 0 0', lineHeight: 1.55, maxWidth: 620 }}>
              Choose how Fono answers your calls. Both paths keep your team on the
              phone with customers. The difference is just{' '}
              <em style={{ fontStyle: 'normal', color: '#1E0E00', fontWeight: 600 }}>when Fono shows up</em>{' '}
              in the call flow.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row" style={{ gap: 12, marginBottom: 18 }}>
          <PathCard path="live" pick={false} recommended disabled={busy} onSelect={() => handlePick('live')} />
          <PathCard path="voicemail" pick={false} disabled={busy} onSelect={() => handlePick('voicemail')} />
        </div>

        <ComparisonChart currentPick={null} />

        <p style={{ fontSize: 13.5, color: '#5C3D22', margin: '16px 4px 0', lineHeight: 1.55, textAlign: 'center', fontStyle: 'italic' }}>
          Most owners pick <strong style={{ fontStyle: 'normal', color: '#1E0E00' }}>Fono Live</strong> once
          they realize what they&rsquo;re missing in their conversations.
        </p>

        {error ? (
          <p
            role="alert"
            style={{
              fontSize: 13,
              color: '#92400E',
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.20)',
              borderRadius: 12,
              padding: '10px 14px',
              margin: '16px 0 0',
            }}
          >
            {error}
          </p>
        ) : null}
      </div>

      {/* Locked sections below the hero. Order per M5/§5.5: How Fono Answers
          first, then Connect, Categories, Notifications. Numbers suppressed
          while no path is picked. */}
      <LockedPreview
        title="How Fono Answers"
        blurb="The path Fono takes on every call."
        blockedReason="Unlocks once you pick a path"
      >
        <LockedPlaceholder />
      </LockedPreview>

      <LockedPreview
        title="Connect"
        blurb="Dial the carrier forwarding code so calls reach Fono."
        blockedReason="Unlocks once you pick a path"
      >
        <LockedPlaceholder />
      </LockedPreview>

      <LockedPreview
        title="Categories"
        blurb="How Fono labels voicemails on the kiosk and in SMS (Order, Catering, Banquet hall, Others)."
        blockedReason="Unlocks once you pick a path"
      >
        <LockedPlaceholder />
      </LockedPreview>

      <LockedPreview
        title="Notifications"
        blurb="When calls happen, how you find out."
        blockedReason="Unlocks once you pick a path"
      >
        <LockedPlaceholder />
      </LockedPreview>
    </div>
  )
}

function LockedPlaceholder() {
  return (
    <div style={{ padding: 24, background: '#fff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ height: 60 }} />
    </div>
  )
}

const SECTION_MONO = "'JetBrains Mono', ui-monospace, monospace"

// Numbered section header for State C. Number comes from displayNumberFor
// (M4 stable per-path numbering); pass null for un-numbered sections.
function SectionLabel({ num, title, blurb }: { num: string | null; title: string; blurb?: string }) {
  return (
    <div style={{ padding: '4px 4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
        {num && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#B0A090', fontFamily: SECTION_MONO, letterSpacing: '0.06em' }}>
            {num}
          </span>
        )}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1E0E00', margin: 0, letterSpacing: '-0.02em' }}>{title}</h2>
      </div>
      {blurb && <p style={{ fontSize: 13, color: '#8B7355', margin: 0, lineHeight: 1.5, maxWidth: 640 }}>{blurb}</p>}
    </div>
  )
}

type StateCSettings = {
  path: 'live' | 'voicemail'
  phone: string
  name: string
  callback: string
  carrier: Carrier
  fonoNumber: string
}

// v3.3 Settings -> Calls State C: fully-configured Calls tab. Renders the
// stable per-path sections (M4 numbering) using the FE-1 component library,
// with Greeting folded in as a real section and Notifications as the proper
// NotificationsMiniCard. Reached only when call_setup_path is set AND
// forwarding is verified (the dispatcher's State C branch).
function CallsStateC() {
  const { current, isAll, tenantId } = useRestaurant()
  const token = useFonoToken()
  const imp = useImpersonation()
  const router = useRouter()
  const tid = isAll ? tenantId : current.id

  const [s, setS] = useState<StateCSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [staffPhone, setStaffPhone] = useState('')
  const [samePhoneError, setSamePhoneError] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [notifyOn, setNotifyOn] = useState(true)
  const [notifyPhone, setNotifyPhone] = useState('')
  const [voicemailOn, setVoicemailOn] = useState(false)
  // Default true: sla_enabled is a default-true backend column, so absence
  // (older payloads / pre-migration) reads as ON.
  const [slaTrackingOn, setSlaTrackingOn] = useState(true)
  const [cats, setCats] = useState<CategoryChipModel[]>([])
  const [catsBusy, setCatsBusy] = useState(false)
  const phoneDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!tid || tid === 'all' || !token) return
    let cancelled = false
    const json = (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    Promise.all([
      json(`${config.apiUrl}/api/v1/tenants/${tid}/settings`),
      json(`${config.apiUrl}/api/v1/tenants/${tid}/forwarding-status`),
      json(`${config.apiUrl}/api/v1/tenants/${tid}/categories`),
    ]).then(([data, fwd, catData]) => {
      if (cancelled || !data) {
        if (!cancelled) setLoading(false)
        return
      }
      const path: 'live' | 'voicemail' = data.call_setup_path === 'voicemail' ? 'voicemail' : 'live'
      setS({
        path,
        phone: data.phone_number || '',
        name: data.name || current.name,
        callback: data.callback_number || '',
        carrier: carrierToEnum(data.carrier_name),
        fonoNumber: fwd?.fono_number || '',
      })
      setStaffPhone(data.callback_number || '')
      setNotifyPhone(data.owner_whatsapp || '')
      setNotifyOn(data.whatsapp_alerts_enabled !== false)
      setVoicemailOn(Boolean(data.voicemail_enabled))
      setSlaTrackingOn(data.sla_enabled !== false)
      if (Array.isArray(catData?.categories)) setCats(catData.categories as CategoryChipModel[])
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [tid, token, current.name])

  const patchPath = async (body: Record<string, string>) => {
    if (imp.readOnly || !tid || tid === 'all' || !token) return
    setSaveError('')
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        router.refresh()
        return
      }
      const detail = await res.json().catch(() => null)
      setSaveError(detail?.detail || 'Could not save. Please try again.')
    } catch {
      setSaveError('Could not reach the server. Please try again.')
    }
  }

  // Quiet PATCH (no router.refresh) for inline edits that should not reload
  // the whole tab — notifications toggle/number.
  const patchTenantQuiet = async (body: Record<string, string | boolean>) => {
    if (imp.readOnly || !tid || tid === 'all' || !token) return
    try {
      await fetch(`${config.apiUrl}/api/v1/tenants/${tid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      /* best-effort; UI keeps optimistic value */
    }
  }

  // Categories CRUD (T-306). Each op returns the full effective list.
  const mutateCategories = async (
    method: 'POST' | 'PATCH' | 'DELETE',
    suffix: string,
    body?: Record<string, string>,
  ) => {
    if (imp.readOnly || !tid || tid === 'all' || !token) return
    setCatsBusy(true)
    setSaveError('')
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}/categories${suffix}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      })
      if (res.ok) {
        const d = await res.json()
        if (Array.isArray(d?.categories)) setCats(d.categories as CategoryChipModel[])
      } else {
        const e = await res.json().catch(() => null)
        setSaveError(e?.detail || 'Could not update categories. Please try again.')
      }
    } catch {
      setSaveError('Could not reach the server. Please try again.')
    }
    setCatsBusy(false)
  }

  const handleNotifyToggle = (next: boolean) => {
    setNotifyOn(next)
    patchTenantQuiet({ whatsapp_alerts_enabled: next })
  }

  // Voicemail capture (T-311). Optimistic with rollback: this gates real
  // call-handling behavior, so a failed PATCH must not leave the UI implying
  // a state the backend never saved.
  const handleVoicemailToggle = async (next: boolean) => {
    if (imp.readOnly || !tid || tid === 'all' || !token) return
    const prev = voicemailOn
    setVoicemailOn(next)
    setSaveError('')
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ voicemail_enabled: next }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setVoicemailOn(prev)
      setSaveError('Could not update voicemail capture. Please try again.')
    }
  }

  // SLA tracking toggle (sla_enabled). Optimistic with rollback, sibling to the
  // voicemail-capture toggle. ON = SLA timers shown; OFF = SLA chrome hidden.
  const handleSlaToggle = async (next: boolean) => {
    if (imp.readOnly || !tid || tid === 'all' || !token) return
    const prev = slaTrackingOn
    setSlaTrackingOn(next)
    setSaveError('')
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sla_enabled: next }),
      })
      if (!res.ok) throw new Error(String(res.status))
    } catch {
      setSlaTrackingOn(prev)
      setSaveError('Could not update SLA tracking. Please try again.')
    }
  }

  const handleNotifyPhone = (v: string) => {
    setNotifyPhone(v)
    if (phoneDebounce.current) clearTimeout(phoneDebounce.current)
    phoneDebounce.current = setTimeout(() => {
      if (v.trim()) patchTenantQuiet({ owner_whatsapp: v.trim() })
    }, 800)
  }

  const handleSelectPath = (next: 'live' | 'voicemail') => {
    if (!s || next === s.path) return
    if (next === 'voicemail') {
      patchPath({ call_setup_path: 'voicemail' })
    } else {
      // Switching to Live needs a staff phone; reveal the field and let the
      // owner Verify (which PATCHes path + callback together).
      setS({ ...s, path: 'live' })
    }
  }

  const handleVerifyStaff = () => {
    if (!s) return
    const clean = staffPhone.replace(/\D/g, '')
    const restaurant = s.phone.replace(/\D/g, '')
    const same = clean.length > 0 && (clean === restaurant || (clean.length === 11 && clean.slice(1) === restaurant))
    if (same || !clean) {
      setSamePhoneError(true)
      return
    }
    setSamePhoneError(false)
    patchPath({ call_setup_path: 'live', callback_number: staffPhone.trim() })
  }

  if (loading || !s) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 60 }}>
        <div className="animate-spin" style={{ width: 24, height: 24, border: '2.5px solid rgba(0,0,0,0.08)', borderTopColor: '#E0602A', borderRadius: '50%' }} />
      </div>
    )
  }

  const isLive = s.path === 'live'
  const num = (id: SectionId) => displayNumberFor(id, s.path, false)

  return (
    <div className="space-y-6">
      {saveError ? (
        <p role="alert" style={{ fontSize: 13, color: '#92400E', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)', borderRadius: 12, padding: '10px 14px' }}>
          {saveError}
        </p>
      ) : null}

      {/* 01 Connect */}
      <SectionLabel num={num('connect')} title="Connect" blurb="How your carrier sends calls to Fono." />
      <ConnectSection tenantPhone={formatPhone(s.phone)} tenantName={s.name} fonoNumber={s.fonoNumber} isLive={isLive} />

      {/* 02 How Fono Answers */}
      <SectionLabel num={num('how-fono-answers')} title="How Fono Answers" blurb="The path Fono takes on every call." />
      <HowFonoAnswersCard
        pick={s.path}
        onSelectPath={imp.readOnly ? undefined : handleSelectPath}
        staffPhone={staffPhone}
        onStaffPhoneChange={(v) => {
          setStaffPhone(v)
          if (samePhoneError) setSamePhoneError(false)
        }}
        onVerifyStaff={imp.readOnly ? undefined : handleVerifyStaff}
        samePhoneError={samePhoneError}
      />

      {/* 03 Call routing (Live only) — full editor lands in FE-4 (needs T-249) */}
      {isLive && (
        <>
          <SectionLabel num={num('call-routing')} title="Call routing" blurb="What happens when your team cannot pick up the bridged call." />
          <CallRoutingCard tenantId={tid} token={token} readOnly={imp.readOnly} />
        </>
      )}

      {/* SLA tracking — owner toggle for the missed-call SLA timers/chrome
          (sla_enabled). Unnumbered, sibling to Voicemail capture. Kiosk
          tab-visibility wiring waits on the CD delta. */}
      <SectionLabel num={null} title="SLA tracking" blurb="Whether the kiosk shows callback countdown timers on missed calls." />
      <SlaTrackingCard
        on={slaTrackingOn}
        onToggle={imp.readOnly ? undefined : handleSlaToggle}
      />

      {/* Voicemail capture — the upstream switch for Categories + the kiosk
          Voicemails tab (T-311). Unnumbered, sits just above Categories. */}
      <SectionLabel num={null} title="Voicemail capture" blurb="Whether Fono takes a voicemail when your team can't pick up." />
      <VoicemailCaptureCard
        on={voicemailOn}
        onToggle={imp.readOnly ? undefined : handleVoicemailToggle}
      />

      {/* 04 Categories — wired to the T-306 CRUD (Option A: surface a key + rename label) */}
      <SectionLabel num={num('categories')} title="Categories" blurb="How Fono labels voicemails on the kiosk and in SMS." />
      <CategoriesChipCard
        categories={cats.length ? cats : undefined}
        busy={catsBusy}
        onAdd={imp.readOnly ? undefined : (key) => mutateCategories('POST', '', { key })}
        onRename={imp.readOnly ? undefined : (key, label) => mutateCategories('PATCH', `/${key}`, { label })}
        onRemove={imp.readOnly ? undefined : (key) => mutateCategories('DELETE', `/${key}`)}
      />

      {/* 05 Notifications — wired to the T-307 PATCH (toggle immediate, number debounced) */}
      <SectionLabel num={num('notifications')} title="Notifications" blurb="When calls happen, how you find out." />
      <NotificationsMiniCard
        on={notifyOn}
        onToggle={imp.readOnly ? undefined : handleNotifyToggle}
        phone={notifyPhone}
        onPhoneChange={imp.readOnly ? undefined : handleNotifyPhone}
      />

      {/* Greeting — folded in as a real Calls section (FE-3) */}
      <SectionLabel num={null} title="Greeting" blurb="The voice and script Fono plays when it answers." />
      <GreetingTab />
    </div>
  )
}

// State C Connect card: verified forwarding status + Fono number + the
// FROM THIS PHONE callout. Re-test forwarding lands with the full Connect
// editor in a later pass.
function ConnectSection({ tenantPhone, tenantName, fonoNumber, isLive }: { tenantPhone: string; tenantName: string; fonoNumber: string; isLive: boolean }) {
  return (
    <VsCard
      title="Connect"
      badge={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: tokens.successFg, background: tokens.successBg, padding: '4px 10px', borderRadius: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: tokens.success }} /> Forwarding active
        </span>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: tokens.fieldBg, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: tokens.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Your Fono number</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: tokens.ink, fontFamily: SECTION_MONO }}>{fonoNumber || '—'}</span>
        </div>
        {fonoNumber && (
          <SettingsButton variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(fonoNumber)}>
            Copy
          </SettingsButton>
        )}
      </div>

      <FromThisPhoneCallout tenantPhone={tenantPhone} tenantName={tenantName} />

      <div style={{ marginTop: 4, padding: '12px 14px', borderRadius: 10, background: tokens.fieldBg, fontSize: 12.5, color: tokens.body, lineHeight: 1.55 }}>
        {isLive
          ? 'Every call goes through Fono first. Your team picks up when Fono bridges to them.'
          : 'Calls to your restaurant still ring you normally. We only step in when no one picks up.'}
      </div>
    </VsCard>
  )
}

// Map the backend's free-form carrier_name string onto our Carrier enum.
function carrierToEnum(name: string | null | undefined): Carrier {
  const cn = (name || '').toLowerCase()
  if (cn.includes('at&t') || cn.includes('att') || cn.includes('cingular')) return 'att'
  if (cn.includes('verizon')) return 'verizon'
  if (cn.includes('t-mobile') || cn.includes('tmobile') || cn.includes('t mobile') || cn.includes('metro')) return 'tmobile'
  if (cn.includes('sprint') || cn.includes('boost')) return 'sprint'
  return 'other'
}

const CARRIER_CHOICES: { id: Carrier; label: string }[] = [
  { id: 'att', label: 'AT&T' },
  { id: 'verizon', label: 'Verizon' },
  { id: 'tmobile', label: 'T-Mobile' },
  { id: 'sprint', label: 'Sprint' },
  { id: 'other', label: 'Other' },
]

// State B — path picked, forwarding not yet verified. The v3.3 FINISH SETUP
// view: the ForwardingCodeCard hero (dial + verify state machine), a "change
// my call path" affordance, and the locked sections below. The dispatcher
// only routes here when call_setup_path is set and forwarding is unverified.
function ForwardingTab() {
  const { current, isAll, tenantId } = useRestaurant()
  const token = useFonoToken()
  const imp = useImpersonation()
  const router = useRouter()
  const tid = isAll ? tenantId : current.id

  const [settings, setSettings] = useState<
    { path: 'live' | 'voicemail'; carrier: Carrier; phone: string; name: string } | null
  >(null)
  const [fonoNumber, setFonoNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialState, setDialState] = useState<'idle' | 'listening' | 'verified' | 'failed'>('idle')
  const [carrierOverride, setCarrierOverride] = useState<Carrier | null>(null)
  const [showCarrierPicker, setShowCarrierPicker] = useState(false)
  const [switchError, setSwitchError] = useState('')

  // Load path / carrier / phone / name once.
  useEffect(() => {
    if (!tid || tid === 'all' || !token) return
    fetch(`${config.apiUrl}/api/v1/tenants/${tid}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && (data.call_setup_path === 'live' || data.call_setup_path === 'voicemail')) {
          setSettings({
            path: data.call_setup_path,
            carrier: carrierToEnum(data.carrier_name),
            phone: data.phone_number || '',
            name: data.name || '',
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [tid, token])

  // Poll forwarding-status: always once for the fono_number; while listening,
  // every 3s to detect the first forwarded call, with a 5-minute failure cap.
  const pollStatus = useCallback(async () => {
    if (!tid || tid === 'all' || !token) return null
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}/forwarding-status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setFonoNumber(data.fono_number || '')
        return data as { verified: boolean }
      }
    } catch {
      /* ignore */
    }
    return null
  }, [tid, token])

  useEffect(() => {
    pollStatus()
  }, [pollStatus])

  useEffect(() => {
    if (dialState !== 'listening') return
    const start = Date.now()
    const id = setInterval(async () => {
      const data = await pollStatus()
      if (data?.verified) {
        clearInterval(id)
        setDialState('verified')
        setTimeout(() => router.refresh(), 1500)
      } else if (Date.now() - start > 5 * 60 * 1000) {
        clearInterval(id)
        setDialState('failed')
      }
    }, 3000)
    return () => clearInterval(id)
  }, [dialState, pollStatus, router])

  // "Change my call path" — the design clears the path and returns to State A.
  // The backend PATCH cannot null call_setup_path yet, so for now this switches
  // to the other path in place (still State B with the new code). Clearing to
  // State A is filed as a backend follow-up.
  const handleSwitchPath = async () => {
    if (imp.readOnly || !settings || !tid || tid === 'all' || !token) return
    const next = settings.path === 'live' ? 'voicemail' : 'live'
    setSwitchError('')
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ call_setup_path: next }),
      })
      if (res.ok) {
        router.refresh()
        return
      }
      const detail = await res.json().catch(() => null)
      setSwitchError(detail?.detail || 'Could not switch your call path. Please try again.')
    } catch {
      setSwitchError('Could not reach the server. Please try again.')
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 60 }}>
        <div className="animate-spin" style={{ width: 24, height: 24, border: '2.5px solid rgba(0,0,0,0.08)', borderTopColor: '#E0602A', borderRadius: '50%' }} />
      </div>
    )
  }

  const path = settings.path
  const isLive = path === 'live'
  const carrier = carrierOverride ?? settings.carrier
  const switchLabel = isLive ? 'Switch to Fono Voicemail' : 'Switch to Fono Live'

  return (
    <div className="space-y-6">
      {/* FINISH SETUP hero */}
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          border: '1px solid rgba(224,96,42,0.25)',
          boxShadow: '0 8px 28px -16px rgba(224,96,42,0.25)',
          padding: '28px 32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: '#E0602A',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              padding: '5px 10px',
              borderRadius: 5,
              background: 'rgba(224,96,42,0.10)',
              flex: '0 0 auto',
              marginTop: 2,
            }}
          >
            Finish setup
          </span>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1E0E00', letterSpacing: '-0.025em', margin: 0, lineHeight: 1.2 }}>
              {isLive ? 'Send every call to Fono' : 'Send your missed calls to Fono'}
            </h2>
            <p style={{ fontSize: 13.5, color: '#5C3D22', margin: '6px 0 0', lineHeight: 1.55 }}>
              {isLive
                ? "You picked Fono Live. From your restaurant's phone, dial the code below to forward every call to Fono."
                : "You picked Fono Voicemail. From your restaurant's phone, dial the code below to forward missed calls to Fono."}
            </p>
          </div>
        </div>

        <ForwardingCodeCard
          carrier={carrier}
          path={path}
          tenantPhone={formatPhone(settings.phone)}
          tenantName={settings.name}
          fonoNumber={fonoNumber || 'your Fono number'}
          state={dialState}
          onDialed={() => !imp.readOnly && setDialState('listening')}
          onRetry={() => setDialState('listening')}
          onCarrierChange={() => setShowCarrierPicker((v) => !v)}
        />

        {showCarrierPicker && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CARRIER_CHOICES.map((c) => {
              const active = c.id === carrier
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCarrierOverride(c.id)
                    setShowCarrierPicker(false)
                  }}
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    padding: '7px 14px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    border: active ? '1.5px solid #E0602A' : '1.5px solid rgba(0,0,0,0.08)',
                    background: active ? 'rgba(224,96,42,0.08)' : '#fff',
                    color: active ? '#E0602A' : '#1E0E00',
                  }}
                >
                  {c.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Change my call path + about-this-card note */}
        <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSwitchPath}
            disabled={imp.readOnly}
            style={{
              background: 'none',
              border: 'none',
              color: '#8B7355',
              fontSize: 12.5,
              cursor: imp.readOnly ? 'not-allowed' : 'pointer',
              padding: 0,
              textDecoration: 'underline',
              textDecorationThickness: 1,
              textUnderlineOffset: 3,
              opacity: imp.readOnly ? 0.5 : 1,
            }}
          >
            {switchLabel}
          </button>
        </div>

        {switchError ? (
          <p role="alert" style={{ fontSize: 12.5, color: '#92400E', margin: '10px 0 0' }}>
            {switchError}
          </p>
        ) : null}

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed rgba(0,0,0,0.06)', fontSize: 11.5, color: '#B0A090', lineHeight: 1.5 }}>
          <strong style={{ color: '#8B7355', fontWeight: 700 }}>About this card:</strong> stands in for the{' '}
          <code style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, padding: '1px 5px', borderRadius: 3, background: '#F5F0EB', color: '#5C3D22' }}>Connect</code>{' '}
          section until forwarding is verified. Once verified it closes and Connect takes the top slot.
        </div>
      </div>

      {/* Locked sections below the hero. */}
      <LockedPreview title="How Fono Answers" blurb="The path Fono takes on every call." blockedReason="Locked while forwarding is incomplete">
        <LockedPlaceholder />
      </LockedPreview>
      {isLive && (
        <LockedPreview title="Call routing" blurb="What happens when your team cannot pick up the bridged call." blockedReason="Locked while forwarding is incomplete">
          <LockedPlaceholder />
        </LockedPreview>
      )}
      <LockedPreview title="Categories" blurb="How Fono labels voicemails on the kiosk and in SMS." blockedReason="Locked while forwarding is incomplete">
        <LockedPlaceholder />
      </LockedPreview>
      <LockedPreview title="Notifications" blurb="When calls happen, how you find out." blockedReason="Locked while forwarding is incomplete">
        <LockedPlaceholder />
      </LockedPreview>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab 4: Plan (Billing)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PlanTab({ isMobile }: { isMobile: boolean }) {
  const plans = MOCK_PLANS
  const usage = MOCK_USAGE
  const invoices = MOCK_INVOICES

  return (
    <div className="space-y-6">
      {/* Founding member notice */}
      <div
        style={{
          borderRadius: 14,
          padding: '16px 20px',
          backgroundColor: 'rgba(224,96,42,0.06)',
          border: '1px solid rgba(224,96,42,0.15)',
        }}
      >
        <p style={{ fontSize: 14, fontWeight: 600, color: '#E0602A' }}>
          You&apos;re a founding member!
        </p>
        <p style={{ fontSize: 13, color: '#5C3D22', marginTop: 4 }}>
          When we launch pricing, you&apos;ll get exclusive founding member rates — locked for life.
        </p>
      </div>

      {/* Current Plan */}
      <SettingsCard>
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#E0602A',
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: 'rgba(224,96,42,0.08)',
            }}
          >
            Founding Member
          </span>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22C55E' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#22C55E' }}>Active</span>
          </div>
        </div>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#1E0E00', marginTop: 8 }}>Early Access</p>
        <p style={{ fontSize: 13, color: '#8B7355', marginTop: 4 }}>No charge during early access</p>
      </SettingsCard>

      {/* Usage */}
      <SettingsCard title="Usage">
        <div className="space-y-4">
          <UsageBar label="Calls this month" value={usage.calls_this_period} max={usage.call_limit} unit="calls" />
          <UsageBar label="Recording storage" value={usage.storage_used_mb} max={usage.storage_limit_mb} unit="MB" />
          <div className="flex items-center justify-between" style={{ paddingTop: 4 }}>
            <span style={{ fontSize: 13, color: '#8B7355' }}>Member since</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1E0E00' }}>February 2026</span>
          </div>
        </div>
      </SettingsCard>

      {/* Plan Cards */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E0E00', marginBottom: 16 }}>Available Plans</h3>
        <div className={isMobile ? 'space-y-4' : 'grid grid-cols-3 gap-4'}>
          {plans.map(plan => (
            <PlanCard key={plan.slug} plan={plan} />
          ))}
        </div>
      </div>

      {/* Features */}
      <SettingsCard title="Included in all plans">
        <ul className="space-y-2">
          {plans[0].features.map(f => (
            <li key={f} className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span style={{ fontSize: 13, color: '#1E0E00' }}>{FEATURE_NAMES[f]}</span>
            </li>
          ))}
        </ul>
      </SettingsCard>

      <SettingsCard title="Coming Soon">
        <ul className="space-y-2">
          {plans[0].upcoming_features.map(f => (
            <li key={f} className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0A090" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span style={{ fontSize: 13, color: '#8B7355' }}>{FEATURE_NAMES[f]}</span>
            </li>
          ))}
          <p style={{ fontSize: 12, color: '#B0A090', marginTop: 8 }}>Founding members get first access</p>
        </ul>
      </SettingsCard>

      {/* Invoices */}
      {invoices.length > 0 && (
        <SettingsCard title="Invoices">
          <div className="space-y-0">
            {invoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#1E0E00' }}>{inv.plan_name}</p>
                  <p style={{ fontSize: 12, color: '#8B7355' }}>{new Date(inv.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1E0E00' }}>${inv.amount.toFixed(2)}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 6,
                      backgroundColor: inv.status === 'paid' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                      color: inv.status === 'paid' ? '#22C55E' : '#F59E0B',
                      textTransform: 'capitalize',
                    }}
                  >
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>
      )}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared Components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab: Greeting (self-service TTS)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GREETING_VOICES: { id: string; label: string; accent: string }[] = [
  { id: 'hf_alpha', label: 'Ananya', accent: 'Hindi female' },
  { id: 'hf_beta', label: 'Bhavna', accent: 'Hindi female' },
  { id: 'af_heart', label: 'Heart', accent: 'American English' },
  { id: 'af_bella', label: 'Bella', accent: 'American English' },
  { id: 'af_sarah', label: 'Sarah', accent: 'American English' },
]

const DEFAULT_TEMPLATE = (name: string) =>
  `Namaste, thanks for calling ${name}. Your call is being recorded for quality assurance. Please hold while we connect you.`

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function GreetingTab() {
  const { current, isAll, tenantId } = useRestaurant()
  const token = useFonoToken()
  const imp = useImpersonation()
  // Resolve tenant id defensively: if state hands us a short/invalid id (has
  // happened in practice on first render), fall back to the env-configured
  // tenant UUID so the request never hits the backend with "ef29".
  const rawTid = isAll ? tenantId : current.id
  const tid = rawTid && UUID_RE.test(rawTid) ? rawTid : config.tenantId
  const restaurantName = isAll ? 'your restaurant' : current.name

  const [text, setText] = useState(DEFAULT_TEMPLATE(restaurantName))
  const [voice, setVoice] = useState<string>('af_heart')
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!tid || tid === 'all' || !token) return
    fetch(`${config.apiUrl}/api/v1/tenants/${tid}/settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          if (data.greeting_text) setText(data.greeting_text)
          else setText(DEFAULT_TEMPLATE(data.name || restaurantName))
          if (data.greeting_voice) setVoice(data.greeting_voice)
          setCurrentUrl(data.greeting_audio_url || null)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tid, token])

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  const handlePreview = async () => {
    if (imp.readOnly) return
    if (!tid || tid === 'all' || !token) return
    setPreviewing(true); setError(null)
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}/greeting/preview`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || `Preview failed (${res.status})`)
      }
      const blob = await res.blob()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)
      new Audio(url).play().catch(() => {})
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Preview failed')
    }
    setPreviewing(false)
  }

  const handleSave = async () => {
    if (imp.readOnly) return
    if (!tid || tid === 'all' || !token) return
    setSaving(true); setError(null)
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}/greeting/save`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || `Save failed (${res.status})`)
      }
      const data = await res.json()
      setCurrentUrl(data.greeting_audio_url)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed')
    }
    setSaving(false)
  }

  if (loading) {
    return <div style={{ fontSize: 14, color: '#8B7355' }}>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <SettingsCard title="Call Greeting">
        <p style={{ fontSize: 13, color: '#5C3D22', marginBottom: 16 }}>
          This is what callers hear the moment they reach your Fono number. Required by California two-party consent law ·
          pick a voice, edit the text, preview, then save.
        </p>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', display: 'block', marginBottom: 6 }}>Greeting text</label>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          maxLength={1200}
          readOnly={imp.readOnly}
          className="read-only:bg-gray-50 read-only:cursor-not-allowed"
          style={{
            width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
            color: '#1E0E00', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10,
            resize: 'vertical', outline: 'none', background: '#fff',
          }}
        />
        <div style={{ fontSize: 11, color: '#B0A090', marginTop: 4, textAlign: 'right' }}>{text.length} / 1200</div>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', display: 'block', marginTop: 16, marginBottom: 6 }}>Voice</label>
        <select
          value={voice}
          onChange={e => setVoice(e.target.value)}
          disabled={imp.readOnly}
          className="disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50"
          style={{
            width: '100%', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
            color: '#1E0E00', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 10,
            background: '#fff', outline: 'none',
          }}
        >
          {GREETING_VOICES.map(v => (
            <option key={v.id} value={v.id}>{v.label} · {v.accent}</option>
          ))}
        </select>

        <div className="flex items-center" style={{ gap: 10, marginTop: 20 }}>
          <button
            onClick={handlePreview}
            disabled={previewing || saving}
            style={{
              padding: '10px 18px', fontSize: 14, fontWeight: 600,
              color: '#E0602A', background: '#fff',
              border: '1px solid #E0602A', borderRadius: 10,
              cursor: previewing ? 'wait' : 'pointer',
              opacity: previewing ? 0.6 : 1,
            }}
          >
            {previewing ? 'Generating...' : 'Preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || previewing}
            style={{
              padding: '10px 18px', fontSize: 14, fontWeight: 600,
              color: '#fff', background: saved ? '#22C55E' : '#E0602A',
              border: 'none', borderRadius: 10,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save greeting'}
          </button>
          {error && <span style={{ fontSize: 13, color: '#EF4444' }}>{error}</span>}
        </div>
      </SettingsCard>

      {currentUrl && (
        <SettingsCard title="Current greeting" badge="Live on inbound calls">
          <audio controls src={currentUrl} style={{ width: '100%' }} />
          <p style={{ fontSize: 12, color: '#B0A090', marginTop: 8 }}>
            Played via Twilio &lt;Play&gt; at the start of every inbound call. Save a new greeting to replace it.
          </p>
        </SettingsCard>
      )}
    </div>
  )
}

function SettingsCard({ title, badge, children }: { title?: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white" style={{ borderRadius: 20, padding: '24px 28px', border: '1px solid rgba(0,0,0,0.04)' }}>
      {(title || badge) && (
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          {title && <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E0E00' }}>{title}</h3>}
          {badge && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#22C55E',
              padding: '3px 10px',
              borderRadius: 6,
              backgroundColor: 'rgba(34,197,94,0.08)',
            }}>
              ✓ {badge}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  )
}


function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn('bg-white relative', plan.is_popular && 'ring-2 ring-terra')}
      style={{ borderRadius: 16, padding: 20, border: '1px solid rgba(0,0,0,0.04)' }}
    >
      {plan.is_popular && (
        <span
          className="absolute"
          style={{
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#fff',
            backgroundColor: '#E0602A',
            padding: '3px 12px',
            borderRadius: 6,
          }}
        >
          Recommended
        </span>
      )}
      <h4 style={{ fontSize: 18, fontWeight: 700, color: '#1E0E00', marginTop: plan.is_popular ? 8 : 0 }}>{plan.name}</h4>
      <div style={{ marginTop: 8 }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: '#B0A090', textDecoration: 'line-through' }}>${plan.price_monthly}</span>
        <span style={{ fontSize: 14, color: '#B0A090', textDecoration: 'line-through' }}>/mo</span>
      </div>
      <p style={{ fontSize: 13, color: '#8B7355', marginTop: 4 }}>
        {plan.call_limit ? `${plan.call_limit} calls/mo` : 'Unlimited calls'}
      </p>
      <p style={{ fontSize: 12, color: '#B0A090', fontWeight: 600, marginTop: 4, textDecoration: 'line-through' }}>
        ${plan.founding_price_monthly}/mo founding rate
      </p>
      <button
        disabled
        className="w-full mt-4"
        style={{
          padding: '10px 0',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 700,
          color: '#8B7355',
          backgroundColor: 'rgba(0,0,0,0.04)',
          border: 'none',
          cursor: 'not-allowed',
          opacity: 0.7,
        }}
      >
        Coming Soon
      </button>
    </div>
  )
}

function UsageBar({ label, value, max, unit }: { label: string; value: number; max: number; unit: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: '#8B7355' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1E0E00' }}>{value} / {max} {unit}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.04)' }}>
        <div
          style={{
            height: '100%',
            borderRadius: 4,
            width: `${pct}%`,
            backgroundColor: pct > 80 ? '#F59E0B' : '#E0602A',
            transition: 'width 300ms ease',
          }}
        />
      </div>
    </div>
  )
}
