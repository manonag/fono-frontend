'use client'

import { useEffect, useState, Suspense } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import FonoLogo from '@/components/logo'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://fono-backend-production.up.railway.app'

interface SignupData {
  name: string
  phone: string
  place_id: string
  address: string
}

function getSignupData(searchParams: URLSearchParams): SignupData | null {
  // Priority 1: URL params
  const name = searchParams.get('name')
  const phone = searchParams.get('phone')
  if (name && phone) {
    return {
      name,
      phone,
      place_id: searchParams.get('place_id') || '',
      address: searchParams.get('address') || '',
    }
  }

  // Priority 2: Cookie
  try {
    const match = document.cookie.match(/(?:^|;\s*)fono_signup_data=([^;]+)/)
    if (match) {
      return JSON.parse(decodeURIComponent(match[1]))
    }
  } catch { /* ignore */ }

  return null
}

function setSignupCookie(data: SignupData) {
  const encoded = encodeURIComponent(JSON.stringify(data))
  document.cookie = `fono_signup_data=${encoded}; path=/; max-age=300; SameSite=Lax`
}

function clearSignupCookie() {
  document.cookie = 'fono_signup_data=; path=/; max-age=0'
}

function SignupCompleteContent() {
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus, update } = useSession()
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // Step 1: Read signup data, save to cookie, fire OAuth
  useEffect(() => {
    const data = getSignupData(searchParams)
    if (!data) {
      window.location.href = 'https://fono.services'
      return
    }

    // Save to cookie (survives OAuth redirect)
    setSignupCookie(data)

    // If not authenticated, fire Google OAuth
    if (sessionStatus === 'unauthenticated') {
      document.cookie = 'fono_is_signup=true; path=/; max-age=300; SameSite=Lax'
      signIn('google', { callbackUrl: '/signup-complete' })
    }
  }, [sessionStatus, searchParams])

  // Step 2: After OAuth, create tenant
  useEffect(() => {
    if (sessionStatus !== 'authenticated' || !session?.fonoToken || creating) return

    const data = getSignupData(searchParams)
    if (!data) return

    setCreating(true)

    // Format phone to E.164
    const digits = data.phone.replace(/\D/g, '')
    const e164 = digits.length === 10 ? `+1${digits}` : `+${digits}`

    fetch(`${API_URL}/api/v1/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.fonoToken}`,
      },
      body: JSON.stringify({
        restaurant_name: data.name,
        owner_name: session.user?.name || '',
        phone_number: e164,
        city: data.address || null,
      }),
    })
      .then(async (res) => {
        if (res.status === 409) {
          // Tenant already exists — just go to dashboard
          clearSignupCookie()
          window.location.href = '/dashboard'
          return
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail || 'Failed to create restaurant')
        }
        return res.json()
      })
      .then(async (result) => {
        if (!result) return // 409 case already redirected
        clearSignupCookie()
        await update()
        setTimeout(() => { window.location.href = '/dashboard' }, 1000)
      })
      .catch((err) => {
        setError(err.message)
        setCreating(false)
      })
  }, [sessionStatus, session, creating, searchParams, update])

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ backgroundColor: '#FDF0E8' }}
      >
        <div className="w-full text-center" style={{ maxWidth: 400 }}>
          <FonoLogo size={32} textColor="#E0602A" mode="orange" />
          <div style={{ marginTop: 24, padding: 20, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 8 }}>Something went wrong</p>
            <p style={{ fontSize: 13, color: '#5C3D22' }}>{error}</p>
          </div>
          <a
            href="https://fono.services"
            style={{ display: 'inline-block', marginTop: 20, fontSize: 14, fontWeight: 600, color: '#E0602A' }}
          >
            Try again
          </a>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#FDF0E8' }}
    >
      <div className="text-center">
        <FonoLogo size={32} textColor="#E0602A" mode="orange" />
        <div className="flex items-center justify-center gap-3" style={{ marginTop: 24 }}>
          <div className="animate-spin" style={{ width: 20, height: 20, border: '2.5px solid rgba(0,0,0,0.08)', borderTopColor: '#E0602A', borderRadius: '50%' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#1E0E00' }}>Setting up your restaurant...</p>
        </div>
      </div>
    </div>
  )
}

export default function SignupCompletePage() {
  return (
    <Suspense>
      <SignupCompleteContent />
    </Suspense>
  )
}
