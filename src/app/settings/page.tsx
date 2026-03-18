'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/header'
import { Sidebar } from '@/components/sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useFonoToken } from '@/hooks/use-fono-token'
import { cn } from '@/lib/utils'
import { config } from '@/lib/config'
import { ConfirmModal } from '@/components/confirm-modal'
import { useRestaurant } from '@/lib/restaurant-context'
import { MOCK_PLANS, MOCK_USAGE, MOCK_INVOICES, FEATURE_NAMES } from '@/lib/mock-data'
import type { Plan } from '@/lib/mock-data'

type SettingsTab = 'restaurant' | 'notifications' | 'plan' | 'forwarding'
const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'restaurant', label: 'Restaurant' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'forwarding', label: 'Call Forwarding' },
  { id: 'plan', label: 'Plan' },
]

function SettingsContent() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabParam === 'forwarding' ? 'forwarding' : 'restaurant'
  )
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
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'forwarding' && <ForwardingTab />}
      {activeTab === 'plan' && <PlanTab isMobile={isMobile} />}
    </div>
  )

  if (isMobile) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <Header variant="dashboard" restaurantName={restaurantName} connected={false} isMobile />
        <main className="flex-1">{content}</main>
        <MobileNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Header variant="dashboard" restaurantName={restaurantName} connected={false} />
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
// Tab 1: Restaurant
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RestaurantTab() {
  const [recordingOn, setRecordingOn] = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const [ownerName, setOwnerName] = useState('Mano')
  const [ownerEmail, setOwnerEmail] = useState('mano@fono.services')
  const [ownerOpen, setOwnerOpen] = useState(false)
  const [dangerOpen, setDangerOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Restaurant Info */}
      <SettingsCard title="Restaurant Info" badge="Synced from Google Places">
        <div className="space-y-3">
          <ReadOnlyField label="Name" value="Spice Garden" />
          <ReadOnlyField label="Address" value="2900 Glendale Ave, Tracy, CA 95377" />
          <ReadOnlyField label="Phone" value="(209) 834-9800" />
          <ReadOnlyField label="Cuisine" value="Indian" />
        </div>
        <p style={{ fontSize: 12, color: '#B0A090', marginTop: 12 }}>
          Info synced from your Google Business listing
        </p>
      </SettingsCard>

      {/* Operating Hours */}
      <SettingsCard title="Operating Hours" badge="Synced from Google Places">
        <div className="space-y-0">
          {[
            { day: 'Monday', open: '11:00 AM', close: '10:00 PM' },
            { day: 'Tuesday', open: '11:00 AM', close: '10:00 PM' },
            { day: 'Wednesday', open: '11:00 AM', close: '10:00 PM' },
            { day: 'Thursday', open: '11:00 AM', close: '10:00 PM' },
            { day: 'Friday', open: '11:00 AM', close: '11:00 PM' },
            { day: 'Saturday', open: '11:00 AM', close: '11:00 PM' },
            { day: 'Sunday', open: '', close: '' },
          ].map(h => (
            <div key={h.day} className="flex items-center justify-between" style={{ padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#1E0E00', width: 100 }}>{h.day}</span>
              {h.open ? (
                <span style={{ fontSize: 13, color: '#5C3D22' }}>{h.open} — {h.close}</span>
              ) : (
                <span style={{ fontSize: 13, color: '#EF4444', fontWeight: 600 }}>Closed</span>
              )}
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Call Recording */}
      <SettingsCard title="Call Recording">
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1E0E00' }}>Record all incoming calls</p>
            <p style={{ fontSize: 12, color: '#8B7355', marginTop: 2 }}>Recordings are encrypted and stored securely</p>
          </div>
          <ToggleSwitch
            on={recordingOn}
            onChange={(val) => {
              if (!val) {
                setShowWarning(true)
              } else {
                setRecordingOn(true)
                setShowWarning(false)
              }
            }}
          />
        </div>

        {showWarning && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#EF4444' }}>Turning off recording will disable:</span>
            </div>
            <ul style={{ fontSize: 13, color: '#5C3D22', paddingLeft: 24, lineHeight: 1.8 }}>
              <li>Call playback in dashboard</li>
              <li>Automatic transcription</li>
              <li>AI-powered call insights</li>
              <li>Call search & filtering</li>
              <li>Weekly performance reports</li>
            </ul>
            <p style={{ fontSize: 12, color: '#8B7355', marginTop: 12 }}>
              Recordings are encrypted (AES-256) and auto-deleted after 90 days.
            </p>
            <div className="flex items-center gap-4" style={{ marginTop: 16 }}>
              <button
                onClick={() => { setShowWarning(false); setRecordingOn(true) }}
                className="bg-terra text-white transition-colors hover:bg-terra-dark"
                style={{ padding: '10px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
              >
                Keep Recording On
              </button>
              <button
                onClick={() => { setShowWarning(false); setRecordingOn(false) }}
                style={{ fontSize: 13, color: '#B0A090', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                Turn off anyway
              </button>
            </div>
          </div>
        )}
      </SettingsCard>

      {/* Owner Account — collapsible */}
      <div className="bg-white" style={{ borderRadius: 20, border: '1px solid rgba(0,0,0,0.04)' }}>
        <button
          onClick={() => setOwnerOpen(prev => !prev)}
          className="flex items-center justify-between w-full text-left transition-colors hover:bg-[#f5efe8]"
          style={{ padding: '20px 28px', borderRadius: 20, cursor: 'pointer', background: 'none', border: 'none' }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1E0E00' }}>Owner Account</h3>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="2"
            style={{ transition: 'transform 0.2s ease', transform: ownerOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <div style={{ maxHeight: ownerOpen ? 400 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
          <div style={{ padding: '0 28px 24px' }}>
            <div className="space-y-4">
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', display: 'block', marginBottom: 6 }}>Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-white focus:outline-none"
                  style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 14 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', display: 'block', marginBottom: 6 }}>Email</label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full bg-white focus:outline-none"
                  style={{ padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 14 }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
                />
              </div>
              <button
                className="text-terra font-semibold hover:underline"
                style={{ fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Change Password
              </button>
            </div>
            <button
              className="bg-terra text-white transition-colors hover:bg-terra-dark mt-4"
              style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone — collapsible */}
      <div style={{ borderRadius: 20, border: '1px solid rgba(239,68,68,0.2)' }}>
        <button
          onClick={() => setDangerOpen(prev => !prev)}
          className="flex items-center justify-between w-full text-left transition-colors hover:bg-[#fef2f2]"
          style={{ padding: '20px 28px', borderRadius: 20, cursor: 'pointer', background: 'none', border: 'none' }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#EF4444' }}>Danger Zone</h3>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2"
            style={{ transition: 'transform 0.2s ease', transform: dangerOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <div style={{ maxHeight: dangerOpen ? 300 : 0, overflow: 'hidden', transition: 'max-height 0.25s ease' }}>
          <div className="space-y-4" style={{ padding: '0 28px 24px' }}>
            <DangerAction
              label="Pause Fono"
              description="Temporarily stop answering calls"
              confirmTitle="Pause Fono?"
              confirmDescription="Fono will stop answering calls for this restaurant. You can resume at any time from this settings page."
              confirmLabel="Pause"
              variant="warning"
            />
            <DangerAction
              label="Delete Recordings"
              description="Permanently delete all recordings"
              confirmTitle="Delete all recordings?"
              confirmDescription="This will permanently delete all call recordings for this restaurant. This action cannot be undone."
              confirmLabel="Delete All Recordings"
            />
            <DangerAction
              label="Delete Restaurant"
              description="Remove this restaurant from Fono"
              confirmTitle="Delete this restaurant?"
              confirmDescription="This will permanently remove this restaurant and all its data from Fono, including call history, recordings, and settings. This action cannot be undone."
              confirmLabel="Delete Restaurant"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab 2: Notifications
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NotificationsTab() {
  const [whatsapp, setWhatsapp] = useState(true)
  const [dailyEmail, setDailyEmail] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(true)
  const [longCallAlert, setLongCallAlert] = useState(false)
  const [alertMinutes, setAlertMinutes] = useState(5)
  const [phone, setPhone] = useState('+1 (209) 555-0123')

  return (
    <div className="space-y-4">
      <SettingsCard>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1E0E00' }}>WhatsApp missed call alerts</p>
            <p style={{ fontSize: 12, color: '#8B7355', marginTop: 2 }}>Get notified instantly when you miss a call</p>
          </div>
          <ToggleSwitch on={whatsapp} onChange={setWhatsapp} />
        </div>
        {whatsapp && (
          <div style={{ marginTop: 12 }}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white focus:outline-none"
              style={{ padding: '10px 14px', borderRadius: 10, border: '1.5px solid rgba(0,0,0,0.08)', fontSize: 13 }}
              placeholder="WhatsApp number"
              onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
            />
          </div>
        )}
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1E0E00' }}>Daily email summary</p>
            <p style={{ fontSize: 12, color: '#8B7355', marginTop: 2 }}>Receive a daily recap of all calls</p>
          </div>
          <ToggleSwitch on={dailyEmail} onChange={setDailyEmail} />
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1E0E00' }}>Weekly performance report</p>
            <p style={{ fontSize: 12, color: '#8B7355', marginTop: 2 }}>Trends and insights every Monday</p>
          </div>
          <ToggleSwitch on={weeklyReport} onChange={setWeeklyReport} />
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1E0E00' }}>Alert for long calls</p>
            <p style={{ fontSize: 12, color: '#8B7355', marginTop: 2 }}>Get notified when calls exceed a duration</p>
          </div>
          <ToggleSwitch on={longCallAlert} onChange={setLongCallAlert} />
        </div>
        {longCallAlert && (
          <div className="flex items-center gap-3" style={{ marginTop: 12 }}>
            <label style={{ fontSize: 13, color: '#5C3D22' }}>Alert after</label>
            <input
              type="number"
              min={1}
              max={60}
              value={alertMinutes}
              onChange={(e) => setAlertMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
              className="bg-white focus:outline-none text-center"
              style={{
                width: 60,
                padding: '8px 10px',
                borderRadius: 10,
                border: '1.5px solid rgba(0,0,0,0.08)',
                fontSize: 14,
                fontWeight: 600,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
            />
            <span style={{ fontSize: 13, color: '#5C3D22' }}>minutes</span>
          </div>
        )}
      </SettingsCard>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tab 3: Call Forwarding
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ForwardingTab() {
  const { current, isAll, tenantId } = useRestaurant()
  const token = useFonoToken()
  const [status, setStatus] = useState<{ verified: boolean; verified_at: string | null; fono_number: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = useCallback(async () => {
    const tid = isAll ? tenantId : current.id
    if (!tid || !token) return
    try {
      const res = await fetch(`${config.apiUrl}/api/v1/tenants/${tid}/forwarding-status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setStatus(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [isAll, tenantId, current.id, token])

  useEffect(() => {
    fetchStatus()
    const id = setInterval(fetchStatus, 5000)
    return () => clearInterval(id)
  }, [fetchStatus])

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ padding: 60 }}>
        <div className="animate-spin" style={{ width: 24, height: 24, border: '2.5px solid rgba(0,0,0,0.08)', borderTopColor: '#E0602A', borderRadius: '50%' }} />
      </div>
    )
  }

  if (status?.verified) {
    return (
      <div className="space-y-6">
        <SettingsCard>
          <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1E0E00' }}>Call Forwarding Verified</p>
              <p style={{ fontSize: 13, color: '#8B7355' }}>
                Verified {status.verified_at ? new Date(status.verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
              </p>
            </div>
          </div>
          <p style={{ fontSize: 14, color: '#5C3D22', lineHeight: 1.6 }}>
            Calls to your restaurant are being forwarded to your Fono number{status.fono_number ? ` (${status.fono_number})` : ''}. Fono is answering and recording incoming calls.
          </p>
        </SettingsCard>
      </div>
    )
  }

  const fonoNumber = status?.fono_number || ''

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div style={{ borderRadius: 14, padding: '16px 20px', backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#F59E0B' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: '#92400E' }}>Forwarding Not Set Up</p>
        </div>
        <p style={{ fontSize: 13, color: '#92400E' }}>
          Set up call forwarding so Fono can answer your restaurant&apos;s calls. Follow the steps below, then call your restaurant number to verify.
        </p>
      </div>

      {/* Fono number */}
      <SettingsCard title="Your Fono Number">
        <div style={{ padding: '12px 16px', borderRadius: 12, backgroundColor: '#F5F0EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1E0E00', letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {fonoNumber || 'Loading...'}
          </span>
          {fonoNumber && (
            <button
              onClick={() => navigator.clipboard.writeText(fonoNumber)}
              style={{ fontSize: 12, fontWeight: 600, color: '#E0602A', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Copy
            </button>
          )}
        </div>
        <p style={{ fontSize: 12, color: '#8B7355', marginTop: 8 }}>
          Forward your restaurant&apos;s calls to this number
        </p>
      </SettingsCard>

      {/* Carrier instructions */}
      <SettingsCard title="Setup Instructions">
        <p style={{ fontSize: 13, color: '#5C3D22', marginBottom: 16, lineHeight: 1.5 }}>
          From your restaurant&apos;s phone, dial the code for your carrier. This sets up call forwarding when you&apos;re busy or don&apos;t answer.
        </p>

        <div className="space-y-3">
          <CarrierStep carrier="iPhone" steps={[
            'Open the Phone app on your iPhone',
            `Dial: *004*${fonoNumber}#`,
            'Tap the green Call button',
            'Wait for "Call Forwarding Activated" confirmation',
            'Call your restaurant number to verify',
          ]} />
          <CarrierStep carrier="Android" steps={[
            'Open the Phone app on your Android',
            'Go to Settings (3 dots or gear icon) → Calls → Call Forwarding',
            `Select "When unanswered" → Enter: ${fonoNumber} → Enable`,
            `Also set "When busy" → Enter: ${fonoNumber} → Enable`,
            'Call your restaurant number to verify',
          ]} />
          <CarrierStep carrier="AT&T" code={`*92${fonoNumber}#`} note="Forwards unanswered calls" />
          <CarrierStep carrier="T-Mobile" code={`**62*${fonoNumber}#`} note="Forwards when unreachable" />
          <CarrierStep carrier="Verizon" code={`*71${fonoNumber}`} note="Forwards all calls" />
          <CarrierStep carrier="Other / Landline" code="" note="Contact your phone provider and ask them to set up call forwarding to the Fono number above" />
        </div>
      </SettingsCard>

      {/* Verify instructions */}
      <SettingsCard title="Verify Setup">
        <div className="space-y-3">
          <StepItem step={1} text="Dial the forwarding code from your restaurant phone" />
          <StepItem step={2} text="You should hear a confirmation tone or message" />
          <StepItem step={3} text="Call your restaurant number from any other phone" />
          <StepItem step={4} text="If Fono answers, verification will happen automatically" />
        </div>
        <div className="flex items-center gap-2" style={{ marginTop: 16, padding: '10px 14px', borderRadius: 10, backgroundColor: 'rgba(224,96,42,0.06)' }}>
          <div className="animate-spin" style={{ width: 14, height: 14, border: '2px solid rgba(224,96,42,0.2)', borderTopColor: '#E0602A', borderRadius: '50%' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#E0602A' }}>Waiting for verification call...</span>
        </div>
      </SettingsCard>
    </div>
  )
}

function CarrierStep({ carrier, code, note, steps }: { carrier: string; code?: string; note?: string; steps?: string[] }) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1E0E00' }}>{carrier}</span>
        {code && (
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            style={{ fontSize: 11, fontWeight: 600, color: '#E0602A', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Copy
          </button>
        )}
      </div>
      {code ? (
        <p style={{ fontSize: 15, fontWeight: 600, color: '#5C3D22', fontFamily: 'monospace', letterSpacing: '0.02em' }}>{code}</p>
      ) : null}
      {note && <p style={{ fontSize: 12, color: '#8B7355', marginTop: 2 }}>{note}</p>}
      {steps && (
        <ol style={{ margin: 0, paddingLeft: 20, marginTop: 4 }}>
          {steps.map((s, i) => (
            <li key={i} style={{ fontSize: 12, color: '#5C3D22', lineHeight: 1.8 }}>{s}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

function StepItem({ step, text }: { step: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: 'rgba(224,96,42,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#E0602A' }}>{step}</span>
      </div>
      <p style={{ fontSize: 13, color: '#5C3D22', lineHeight: 1.5, paddingTop: 2 }}>{text}</p>
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#8B7355', display: 'block', marginBottom: 4 }}>{label}</label>
      <div
        className="bg-cream"
        style={{ padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#5C3D22' }}
      >
        {value}
      </div>
    </div>
  )
}

function ToggleSwitch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn('relative transition-colors flex-shrink-0', on ? 'bg-green-500' : 'bg-gray-300')}
      style={{ width: 44, height: 24, borderRadius: 12, cursor: 'pointer', border: 'none' }}
    >
      <div
        className="absolute bg-white rounded-full transition-transform shadow-sm"
        style={{
          width: 20,
          height: 20,
          top: 2,
          left: on ? 22 : 2,
        }}
      />
    </button>
  )
}

function DangerAction({ label, description, confirmTitle, confirmDescription, confirmLabel, variant }: {
  label: string; description: string; confirmTitle: string; confirmDescription: string
  confirmLabel?: string; variant?: 'danger' | 'warning'
}) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between" style={{ padding: '8px 0' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: '#1E0E00' }}>{label}</p>
          <p style={{ fontSize: 12, color: '#8B7355' }}>{description}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="transition-colors"
          style={{
            padding: '8px 16px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            color: '#EF4444',
            border: '1px solid rgba(239,68,68,0.2)',
            backgroundColor: 'transparent',
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      </div>
      <ConfirmModal
        open={showModal}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel || label}
        onConfirm={() => setShowModal(false)}
        onCancel={() => setShowModal(false)}
        variant={variant || 'danger'}
      />
    </>
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
