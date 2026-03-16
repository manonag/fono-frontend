'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import FonoLogo from '@/components/logo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fono-backend-production.up.railway.app'

/** Strip raw input to max 10 digits and format as +1-XXX-XXX-XXXX progressively. */
function maskPhone(raw: string): string {
  // Strip everything except digits
  let digits = raw.replace(/\D/g, '')
  // If user pasted/typed a leading 1 for 11-digit number, drop it
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1)
  // Cap at 10 digits
  digits = digits.slice(0, 10)
  if (digits.length === 0) return ''
  // Build formatted string progressively
  let out = '+1-'
  out += digits.slice(0, 3)
  if (digits.length > 3) out += '-' + digits.slice(3, 6)
  if (digits.length > 6) out += '-' + digits.slice(6)
  return out
}

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession()

  // Determine starting step from URL param
  const stepParam = searchParams.get('step')
  const [step, setStep] = useState<'form' | 'creating' | 'done'>(
    stepParam === 'restaurant' ? 'form' : 'form'
  )

  // Form state
  const [restaurantName, setRestaurantName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [callbackNumber, setCallbackNumber] = useState('')
  const [callbackEdited, setCallbackEdited] = useState(false)
  const [city, setCity] = useState('')
  const [error, setError] = useState('')
  const [, setCreating] = useState(false)

  // After OAuth callback: if user is authenticated and has pending signup data, create tenant
  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !session?.fonoToken) return

    const pending = sessionStorage.getItem('fono_signup')
    if (!pending) return

    const data = JSON.parse(pending)
    setCreating(true)
    setStep('creating')

    const tenantBody = {
      restaurant_name: data.restaurant_name,
      owner_name: data.owner_name,
      phone_number: data.phone_number,
      callback_number: data.callback_number,
      city: data.city || null,
    }
    console.log('[Signup] POST /api/v1/tenants →', { url: `${API_URL}/api/v1/tenants`, body: tenantBody, hasToken: !!session.fonoToken })

    fetch(`${API_URL}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.fonoToken}`,
      },
      body: JSON.stringify(tenantBody),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail || 'Failed to create restaurant')
        }
        return res.json()
      })
      .then(() => {
        sessionStorage.removeItem('fono_signup')
        setStep('done')
        // Small delay then redirect to dashboard
        setTimeout(() => router.push('/dashboard'), 1500)
      })
      .catch((err) => {
        setError(err.message)
        setCreating(false)
        setStep('form')
        // Restore form data
        setRestaurantName(data.restaurant_name || '')
        setOwnerName(data.owner_name || '')
        setPhoneNumber(data.phone_number || '')
        setCallbackNumber(data.callback_number || '')
        setCity(data.city || '')
      })
  }, [sessionStatus, session, router])

  const isFormValid =
    restaurantName.trim() &&
    ownerName.trim() &&
    phoneNumber.trim() &&
    callbackNumber.trim()

  const handleSubmitForm = () => {
    if (!isFormValid) return

    // Save form data to sessionStorage (survives OAuth redirect)
    sessionStorage.setItem(
      'fono_signup',
      JSON.stringify({
        restaurant_name: restaurantName.trim(),
        owner_name: ownerName.trim(),
        phone_number: phoneNumber.trim(),
        callback_number: callbackNumber.trim(),
        city: city.trim(),
      })
    )

    // Set cookie so NextAuth knows this is a signup
    document.cookie = 'fono_is_signup=true; path=/; max-age=300; SameSite=Lax'

    // Kick off Google OAuth — will redirect back here after success
    signIn('google', { callbackUrl: '/signup' })
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#FDF0E8' }}
    >
      <div className="w-full" style={{ maxWidth: 420 }}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <FonoLogo size={48} textColor="#E0602A" mode="light" />
        </div>

        {/* Creating state */}
        {step === 'creating' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div
              style={{
                width: 48,
                height: 48,
                border: '3px solid #E0602A',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 24px',
              }}
            />
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1E0E00' }}>
              Setting up your restaurant...
            </p>
            <p style={{ fontSize: 14, color: '#8B7355', marginTop: 8 }}>
              This will just take a moment.
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {/* Done state */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'rgba(34,197,94,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p style={{ fontSize: 22, fontWeight: 800, color: '#1E0E00' }}>
              Welcome to Fono!
            </p>
            <p style={{ fontSize: 14, color: '#8B7355', marginTop: 8 }}>
              Redirecting to your dashboard...
            </p>
          </div>
        )}

        {/* Step 1: Restaurant form */}
        {step === 'form' && (
          <>
            <p
              style={{
                fontSize: 16,
                fontWeight: 500,
                color: '#8B7355',
                textAlign: 'center',
                marginBottom: 32,
                lineHeight: 1.5,
              }}
            >
              Set up your restaurant in 2 minutes
            </p>

            {/* Error banner */}
            {error && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: 12,
                  padding: '12px 16px',
                  marginBottom: 16,
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 13, color: '#DC2626' }}>{error}</p>
              </div>
            )}

            <div
              className="bg-white"
              style={{
                borderRadius: 24,
                padding: '32px 28px',
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              }}
            >
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#1E0E00',
                  textAlign: 'center',
                  letterSpacing: '-0.02em',
                  marginBottom: 24,
                }}
              >
                Your restaurant details
              </h1>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <PlacesAutocompleteField
                  value={restaurantName}
                  onChange={setRestaurantName}
                  onPlaceSelect={(name, placeCity) => {
                    setRestaurantName(name)
                    if (placeCity) setCity(placeCity)
                  }}
                />
                <FormField
                  label="Your name"
                  value={ownerName}
                  onChange={setOwnerName}
                  placeholder="Your full name"
                />
                <PhoneField
                  label="Restaurant phone number"
                  value={phoneNumber}
                  onChange={(v) => {
                    setPhoneNumber(v)
                    if (!callbackEdited) setCallbackNumber(v)
                  }}
                  helper="The number customers call"
                />
                <PhoneField
                  label="Your callback number"
                  value={callbackNumber}
                  onChange={(v) => {
                    setCallbackNumber(v)
                    setCallbackEdited(true)
                  }}
                  helper="Defaults to your main number. Change only if you have a separate direct line for callbacks."
                />
                <FormField
                  label="City (optional)"
                  value={city}
                  onChange={setCity}
                  placeholder="e.g. Tracy, CA"
                />

              </div>

              {/* Continue button → triggers Google OAuth */}
              <button
                onClick={handleSubmitForm}
                disabled={!isFormValid}
                className="w-full flex items-center justify-center gap-3 transition-all"
                style={{
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: isFormValid ? '#E0602A' : '#D1C8C0',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                  marginTop: 24,
                  border: 'none',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#fff" fillOpacity="0.9" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#fff" fillOpacity="0.7" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fff" fillOpacity="0.6" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#fff" fillOpacity="0.8" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Login link */}
            <p
              style={{
                fontSize: 13,
                color: '#8B7355',
                textAlign: 'center',
                marginTop: 24,
              }}
            >
              Already have an account?{' '}
              <a href="/login" style={{ color: '#E0602A', fontWeight: 600 }}>
                Sign in
              </a>
            </p>

            <p
              style={{
                fontSize: 12,
                color: '#B0A090',
                textAlign: 'center',
                marginTop: 16,
              }}
            >
              By signing up, you agree to Fono&apos;s Terms of Service
            </p>
          </>
        )}
      </div>
    </div>
  )
}

interface Prediction {
  placeId: string
  name: string
  address: string
}

function PlacesAutocompleteField({
  value,
  onChange,
  onPlaceSelect,
}: {
  value: string
  onChange: (v: string) => void
  onPlaceSelect: (name: string, city: string) => void
}) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesRef = useRef<google.maps.places.PlacesService | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dummyDiv = useRef<HTMLDivElement | null>(null)

  // Load the Google Maps Places library once
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    console.log('[PlacesAutocomplete] API key present:', !!key)
    if (!key || autocompleteRef.current) return

    setOptions({ key, libraries: ['places'] })
    importLibrary('places').then(() => {
      console.log('[PlacesAutocomplete] Places library loaded')
      autocompleteRef.current = new google.maps.places.AutocompleteService()
      // PlacesService needs a div (not rendered)
      if (!dummyDiv.current) {
        dummyDiv.current = document.createElement('div')
      }
      placesRef.current = new google.maps.places.PlacesService(dummyDiv.current)
    }).catch((err) => {
      console.error('[PlacesAutocomplete] Failed to load:', err)
    })
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteRef.current || input.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    autocompleteRef.current.getPlacePredictions(
      {
        input,
        types: ['establishment'],
        componentRestrictions: { country: 'us' },
      },
      (results, status) => {
        setLoading(false)
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          setSuggestions(
            results.slice(0, 5).map((r) => ({
              placeId: r.place_id,
              name: r.structured_formatting.main_text,
              address: r.structured_formatting.secondary_text || '',
            }))
          )
          setOpen(true)
        } else {
          setSuggestions([])
          setOpen(true) // still show "Use as typed" fallback
        }
      }
    )
  }, [])

  const handleInputChange = (v: string) => {
    onChange(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPredictions(v), 250)
  }

  const handleSelect = (prediction: Prediction) => {
    setOpen(false)
    onChange(prediction.name)

    if (!placesRef.current) {
      onPlaceSelect(prediction.name, '')
      return
    }

    placesRef.current.getDetails(
      { placeId: prediction.placeId, fields: ['address_components', 'name'] },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          onPlaceSelect(prediction.name, '')
          return
        }
        const comps = place.address_components || []
        const locality = comps.find((c) => c.types.includes('locality'))
        const state = comps.find((c) => c.types.includes('administrative_area_level_1'))
        const cityStr = [locality?.long_name, state?.short_name].filter(Boolean).join(', ')
        onPlaceSelect(place.name || prediction.name, cityStr)
      }
    )
  }

  const handleUseAsTyped = () => {
    setOpen(false)
    onPlaceSelect(value, '')
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#8B7355',
          display: 'block',
          marginBottom: 6,
        }}
      >
        Restaurant name
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (value.length >= 2) fetchPredictions(value) }}
          placeholder="Search for your restaurant..."
          className="w-full focus:outline-none"
          style={{
            padding: '12px 14px 12px 38px',
            borderRadius: 12,
            border: '1.5px solid rgba(0,0,0,0.1)',
            backgroundColor: '#fff',
            color: '#1E0E00',
            fontSize: 14,
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = '#E0602A'
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'
          }}
        />
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#B0A090"
          strokeWidth="2"
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {loading && (
          <div
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 16,
              height: 16,
              border: '2px solid #E0602A',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && value.length >= 2 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            borderRadius: 12,
            border: '1px solid rgba(0,0,0,0.08)',
            backgroundColor: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {suggestions.map((s, i) => (
            <button
              key={s.placeId}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className="w-full text-left transition-colors hover:bg-gray-50"
              style={{
                padding: '12px 14px',
                borderBottom: i < suggestions.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                borderBottomStyle: i < suggestions.length - 1 ? 'solid' : 'none',
                borderBottomWidth: i < suggestions.length - 1 ? 1 : 0,
                borderBottomColor: 'rgba(0,0,0,0.04)',
                display: 'block',
                width: '100%',
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E0E00' }}>{s.name}</p>
              <p style={{ fontSize: 12, color: '#8B7355', marginTop: 2 }}>{s.address}</p>
            </button>
          ))}

          {/* Fallback: use as typed */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleUseAsTyped}
            className="w-full text-left transition-colors hover:bg-gray-50"
            style={{
              padding: '12px 14px',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              borderTop: suggestions.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
              display: 'block',
              width: '100%',
            }}
          >
            <p style={{ fontSize: 13, color: '#E0602A', fontWeight: 600 }}>
              Use &ldquo;{value}&rdquo; as typed
            </p>
          </button>
        </div>
      )}
    </div>
  )
}

function PhoneField({
  label,
  value,
  onChange,
  helper,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  helper?: string
}) {
  const handleChange = (raw: string) => {
    onChange(maskPhone(raw))
  }

  return (
    <div>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#8B7355',
          display: 'block',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="+1-XXX-XXX-XXXX"
        className="w-full focus:outline-none"
        style={{
          padding: '12px 14px',
          borderRadius: 12,
          border: '1.5px solid rgba(0,0,0,0.1)',
          backgroundColor: '#fff',
          color: '#1E0E00',
          fontSize: 14,
          letterSpacing: '0.02em',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#E0602A'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'
        }}
      />
      {helper && (
        <p style={{ fontSize: 11, color: '#B0A090', marginTop: 4 }}>{helper}</p>
      )}
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  helper?: string
}) {
  return (
    <div>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: '#8B7355',
          display: 'block',
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full focus:outline-none"
        style={{
          padding: '12px 14px',
          borderRadius: 12,
          border: '1.5px solid rgba(0,0,0,0.1)',
          backgroundColor: '#fff',
          color: '#1E0E00',
          fontSize: 14,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#E0602A'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)'
        }}
      />
      {helper && (
        <p style={{ fontSize: 11, color: '#B0A090', marginTop: 4 }}>{helper}</p>
      )}
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  )
}
