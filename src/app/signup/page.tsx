'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MOCK_PLANS, FEATURE_NAMES } from '@/lib/mock-data'
import type { Plan } from '@/lib/mock-data'

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 'done'

interface RestaurantInfo {
  name: string
  address: string
  cuisine: string
  rating: number
  hours: string
}

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)

  // Step 2
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'owner' | 'manager' | 'staff'>('owner')

  // Step 3
  const [otp, setOtp] = useState(['', '', '', '', '', ''])

  // Step 4
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Step 5
  const [carrier, setCarrier] = useState('att')
  const [testStatus, setTestStatus] = useState<'idle' | 'calling' | 'success' | 'failed'>('idle')

  // Step 6
  const [selectedPlan, setSelectedPlan] = useState('growth')

  const next = () => {
    if (step === 6) setStep('done')
    else if (step !== 'done') setStep((step + 1) as Step)
  }
  const back = () => {
    if (step !== 'done' && step > 1) setStep((step - 1) as Step)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1E0E00' }}>
      {/* Progress dots */}
      {step !== 'done' && (
        <div className="flex items-center justify-center gap-3 pt-8 pb-6">
          {[1, 2, 3, 4, 5, 6].map(s => (
            <div
              key={s}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor:
                  s < (step as number) ? '#E0602A'
                    : s === step ? '#E0602A'
                      : 'rgba(255,255,255,0.15)',
                opacity: s === step ? 0.7 : 1,
                transition: 'all 200ms ease',
              }}
            />
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center px-4" style={{ maxWidth: 480, margin: '0 auto', width: '100%' }}>
        {/* Back button */}
        {step !== 'done' && (step as number) > 1 && (
          <button
            onClick={back}
            className="self-start flex items-center gap-2 mb-6 transition-opacity hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}

        {/* Step 1: Find Restaurant */}
        {step === 1 && (
          <StepContainer stepNum={1} title="What's your restaurant called?">
            <div className="relative w-full">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8"
                className="absolute" style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search for your restaurant..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowResults(e.target.value.length > 2) }}
                className="w-full focus:outline-none"
                style={{
                  padding: '16px 16px 16px 44px',
                  borderRadius: 14,
                  border: '1.5px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: 15,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
              />
            </div>

            {showResults && !restaurant && (
              <div className="w-full mt-3" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                {[
                  { name: 'Spice Garden', address: '2900 Glendale Ave, Tracy, CA 95377', cuisine: 'Indian', rating: 4.3, hours: 'Mon-Sat: 11:00 AM - 10:00 PM\nSun: Closed' },
                  { name: 'Spice Kitchen', address: '1400 Main St, Manteca, CA', cuisine: 'Indian', rating: 4.1, hours: 'Mon-Sun: 11:00 AM - 9:30 PM' },
                ].map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setRestaurant(r); setShowResults(false) }}
                    className="w-full text-left transition-colors hover:bg-white/5"
                    style={{
                      padding: '14px 16px',
                      borderBottom: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      background: 'rgba(255,255,255,0.03)',
                    }}
                  >
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{r.name}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{r.address}</p>
                  </button>
                ))}
              </div>
            )}

            {restaurant && (
              <div className="w-full mt-4" style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', padding: 20, backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{restaurant.name}</p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{restaurant.address}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{restaurant.cuisine}</span>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>&middot;</span>
                  <span style={{ fontSize: 13, color: '#F59E0B' }}>★ {restaurant.rating}</span>
                </div>
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Hours:</p>
                  {restaurant.hours.split('\n').map((line, i) => (
                    <p key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{line}</p>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: 12, color: '#22C55E' }}>Hours and details synced</span>
                </div>
                <button
                  onClick={() => { setRestaurant(null); setSearchQuery('') }}
                  className="mt-3"
                  style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Not your restaurant? Search again
                </button>
              </div>
            )}

            {restaurant && (
              <button onClick={next} className="w-full mt-6 bg-terra text-white font-bold transition-colors hover:bg-terra-dark" style={{ height: 52, borderRadius: 14, fontSize: 16, cursor: 'pointer' }}>
                Continue →
              </button>
            )}
          </StepContainer>
        )}

        {/* Step 2: Your Details */}
        {step === 2 && (
          <StepContainer stepNum={2} title="Tell us about yourself">
            <div className="w-full space-y-4">
              <DarkInput label="Name" value={name} onChange={setName} placeholder="Your full name" />
              <DarkInput label="WhatsApp" value={whatsapp} onChange={setWhatsapp} placeholder="+1 (209) 555-0123" helper="We'll send missed call alerts here" />
              <DarkInput label="Email" value={email} onChange={setEmail} placeholder="you@restaurant.com" type="email" helper="For weekly reports and account recovery" />

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>Your role</label>
                <div className="flex gap-2">
                  {(['owner', 'manager', 'staff'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className="transition-all"
                      style={{
                        padding: '10px 20px',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: role === r ? 600 : 400,
                        backgroundColor: role === r ? '#E0602A' : 'rgba(255,255,255,0.05)',
                        color: role === r ? '#fff' : 'rgba(255,255,255,0.6)',
                        border: role === r ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={next}
              disabled={!name || !email}
              className={cn('w-full mt-6 text-white font-bold transition-colors', name && email ? 'bg-terra hover:bg-terra-dark' : 'bg-gray-600 cursor-not-allowed')}
              style={{ height: 52, borderRadius: 14, fontSize: 16 }}
            >
              Continue →
            </button>
          </StepContainer>
        )}

        {/* Step 3: Verify Number */}
        {step === 3 && (
          <StepContainer stepNum={3} title="Verify your WhatsApp number">
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 24, textAlign: 'center' }}>
              Enter the 6-digit code sent to {whatsapp || '+1 (209) 555-0123'}
            </p>
            <OtpInput value={otp} onChange={setOtp} />
            <div className="flex items-center gap-4 mt-6">
              <button style={{ fontSize: 13, color: '#E0602A', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Resend code
              </button>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>|</span>
              <button style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Send via SMS instead
              </button>
            </div>
            <button onClick={next} className="w-full mt-8 bg-terra text-white font-bold transition-colors hover:bg-terra-dark" style={{ height: 52, borderRadius: 14, fontSize: 16, cursor: 'pointer' }}>
              Verify →
            </button>
          </StepContainer>
        )}

        {/* Step 4: Set Password */}
        {step === 4 && (
          <StepContainer stepNum={4} title="Create your password">
            <div className="w-full space-y-4">
              <DarkInput label="Password" value={password} onChange={setPassword} type="password" placeholder="At least 8 characters" />
              <DarkInput label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="Confirm your password" />

              <div className="space-y-2 mt-2">
                <PasswordCheck label="At least 8 characters" met={password.length >= 8} />
                <PasswordCheck label="One uppercase letter" met={/[A-Z]/.test(password)} />
                <PasswordCheck label="One number" met={/\d/.test(password)} />
              </div>
            </div>

            <button
              onClick={next}
              disabled={password.length < 8 || password !== confirmPassword}
              className={cn(
                'w-full mt-6 text-white font-bold transition-colors',
                password.length >= 8 && password === confirmPassword ? 'bg-terra hover:bg-terra-dark' : 'bg-gray-600 cursor-not-allowed'
              )}
              style={{ height: 52, borderRadius: 14, fontSize: 16 }}
            >
              Create my account →
            </button>
          </StepContainer>
        )}

        {/* Step 5: Connect Phone */}
        {step === 5 && (
          <StepContainer stepNum={5} title="Connect your phone line">
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20, textAlign: 'center' }}>
              We&apos;ve set up a local number for {restaurant?.name || 'your restaurant'}:
            </p>

            <div className="w-full" style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', backgroundColor: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>+1 (209) 579-3201</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Local Tracy, CA · Just for you</p>
            </div>

            <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginTop: 24, marginBottom: 12 }}>
              Forward your restaurant calls to this number:
            </p>

            <div className="flex flex-wrap gap-2 w-full mb-4">
              {[
                { id: 'att', label: 'AT&T' },
                { id: 'tmobile', label: 'T-Mobile' },
                { id: 'verizon', label: 'Verizon' },
                { id: 'landline', label: 'Landline' },
                { id: 'voip', label: 'VoIP' },
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => setCarrier(c.id)}
                  className="transition-all"
                  style={{
                    padding: '8px 16px',
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: carrier === c.id ? 600 : 400,
                    backgroundColor: carrier === c.id ? '#E0602A' : 'rgba(255,255,255,0.05)',
                    color: carrier === c.id ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: carrier === c.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <div className="w-full" style={{ borderRadius: 12, padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>
                {carrier === 'att' ? 'AT&T' : carrier === 'tmobile' ? 'T-Mobile' : carrier === 'verizon' ? 'Verizon' : carrier === 'landline' ? 'Landline' : 'VoIP'} instructions:
              </p>
              <ol className="space-y-1" style={{ paddingLeft: 20 }}>
                <li style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>1. Pick up your restaurant phone</li>
                <li style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>2. Dial: <span style={{ color: '#E0602A', fontWeight: 600 }}>*21*12095793201#</span></li>
                <li style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>3. Listen for the confirmation tone</li>
              </ol>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>To undo: Dial ##21#</p>
            </div>

            <div className="w-full mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>Test the connection:</p>
              <button
                onClick={() => { setTestStatus('calling'); setTimeout(() => setTestStatus('success'), 2000) }}
                className="w-full flex items-center justify-center gap-2 transition-colors"
                style={{
                  height: 48,
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: testStatus === 'success' ? '#22C55E' : testStatus === 'calling' ? '#F59E0B' : 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                }}
              >
                {testStatus === 'idle' && 'Call my restaurant now'}
                {testStatus === 'calling' && 'Calling...'}
                {testStatus === 'success' && 'Connected!'}
                {testStatus === 'failed' && 'Failed — try again'}
              </button>
            </div>

            <button onClick={next} className="w-full mt-6 bg-terra text-white font-bold transition-colors hover:bg-terra-dark" style={{ height: 52, borderRadius: 14, fontSize: 16, cursor: 'pointer' }}>
              Forwarding works — let&apos;s go! →
            </button>
            <button onClick={next} className="mt-3 mb-8" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
              I&apos;ll set this up later →
            </button>
          </StepContainer>
        )}

        {/* Step 6: Choose Plan */}
        {step === 6 && (
          <StepContainer stepNum={6} title="Choose your plan">
            <div className="w-full space-y-4 mb-6">
              {MOCK_PLANS.map(plan => (
                <PlanOption
                  key={plan.slug}
                  plan={plan}
                  selected={selectedPlan === plan.slug}
                  onSelect={() => setSelectedPlan(plan.slug)}
                />
              ))}
            </div>

            <div className="w-full mb-4">
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 10 }}>
                Included in all plans:
              </p>
              <ul className="space-y-2">
                {MOCK_PLANS[0].features.map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{FEATURE_NAMES[f]}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full mb-6">
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>
                Coming Soon:
              </p>
              <ul className="space-y-2">
                {MOCK_PLANS[0].upcoming_features.map(f => (
                  <li key={f} className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{FEATURE_NAMES[f]}</span>
                  </li>
                ))}
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Founding members get first access</p>
              </ul>
            </div>

            <div className="flex items-center gap-2 mb-4 justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>256-bit · PCI compliant · Secured by Stripe</span>
            </div>

            <button onClick={next} className="w-full bg-terra text-white font-bold transition-colors hover:bg-terra-dark" style={{ height: 52, borderRadius: 14, fontSize: 16, cursor: 'pointer' }}>
              Start {MOCK_PLANS.find(p => p.slug === selectedPlan)?.name} Plan — ${MOCK_PLANS.find(p => p.slug === selectedPlan)?.founding_price_monthly}/mo
            </button>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 8 }}>
              We never see your card details. Cancel anytime.
            </p>
            <button onClick={next} className="mt-2 mb-8" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
              I&apos;ll add payment later →
            </button>
          </StepContainer>
        )}

        {/* Celebration Page */}
        {step === 'done' && (
          <div className="flex flex-col items-center justify-center flex-1 py-12 text-center">
            <div className="mb-6">
              <div className="flex items-center justify-center" style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: 'rgba(34,197,94,0.15)' }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Welcome to Fono!</h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
              {restaurant?.name || 'Your restaurant'} is now connected.
            </p>
            <p style={{ fontSize: 14, color: '#E0602A', fontWeight: 600, marginBottom: 24 }}>
              You&apos;re founding member #7.
            </p>

            <div className="w-full" style={{ maxWidth: 280, marginBottom: 32 }}>
              <div style={{ height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '70%', borderRadius: 5, backgroundColor: '#E0602A' }} />
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>7 of 10 spots taken</p>
            </div>

            <div className="w-full text-left" style={{ maxWidth: 320, marginBottom: 32 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
                As a founding member, you get:
              </p>
              <ul className="space-y-2">
                {[
                  'Locked-in founding pricing',
                  'First access to AI features',
                  'Direct line to the team',
                  'Shape the product roadmap',
                  'Priority support',
                ].map(perk => (
                  <li key={perk} className="flex items-center gap-2">
                    <span style={{ color: '#E0602A' }}>•</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-terra text-white font-bold transition-colors hover:bg-terra-dark"
              style={{ height: 52, borderRadius: 14, fontSize: 16, cursor: 'pointer', maxWidth: 360 }}
            >
              Go to Dashboard →
            </button>
            <button
              className="mt-4 mb-8"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Share Fono with another restaurant owner →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sub-components
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StepContainer({ stepNum, title, children }: { stepNum: number; title: string; children: React.ReactNode }) {
  return (
    <div className="w-full flex flex-col items-center">
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#E0602A', marginBottom: 8 }}>
        Step {stepNum} of 6
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', textAlign: 'center', letterSpacing: '-0.02em', marginBottom: 24 }}>
        {title}
      </h1>
      {children}
    </div>
  )
}

function DarkInput({ label, value, onChange, placeholder, type = 'text', helper }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; helper?: string
}) {
  return (
    <div className="w-full">
      <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full focus:outline-none"
        style={{
          padding: '14px 16px',
          borderRadius: 12,
          border: '1.5px solid rgba(255,255,255,0.1)',
          backgroundColor: 'rgba(255,255,255,0.05)',
          color: '#fff',
          fontSize: 14,
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
      />
      {helper && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{helper}</p>}
    </div>
  )
}

function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (index: number, digit: string) => {
    if (!/^\d?$/.test(digit)) return
    const next = [...value]
    next[index] = digit
    onChange(next)
    if (digit && index < 5) {
      refs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex gap-3 justify-center">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="text-center focus:outline-none"
          style={{
            width: 48,
            height: 56,
            borderRadius: 12,
            border: digit ? '2px solid #E0602A' : '1.5px solid rgba(255,255,255,0.15)',
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: '#fff',
            fontSize: 22,
            fontWeight: 700,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#E0602A' }}
          onBlur={(e) => { if (!digit) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
        />
      ))}
    </div>
  )
}

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.2)' }} />
      )}
      <span style={{ fontSize: 13, color: met ? '#22C55E' : 'rgba(255,255,255,0.4)' }}>{label}</span>
    </div>
  )
}

function PlanOption({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={cn('w-full text-left transition-all', selected && 'ring-2 ring-terra')}
      style={{
        borderRadius: 16,
        padding: '16px 20px',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: selected ? '1px solid #E0602A' : '1px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      {plan.is_popular && (
        <span style={{
          position: 'absolute', top: -8, right: 16,
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
          color: '#fff', backgroundColor: '#E0602A', padding: '2px 10px', borderRadius: 5,
        }}>
          Recommended
        </span>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{plan.name}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
            {plan.call_limit ? `${plan.call_limit} calls/mo` : 'Unlimited calls'}
          </p>
        </div>
        <div className="text-right">
          <p style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>${plan.price_monthly}</p>
          <p style={{ fontSize: 11, color: '#E0602A', fontWeight: 600 }}>${plan.founding_price_monthly}/mo founding</p>
        </div>
      </div>
    </button>
  )
}
