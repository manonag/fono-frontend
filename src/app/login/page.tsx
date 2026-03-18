'use client'

import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import FonoLogo from '@/components/logo'

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const redirect = searchParams.get('redirect')
  const isKiosk = redirect?.startsWith('/kiosk')

  const handleLogin = () => {
    // Set cookie so NextAuth callback knows this is a login (not signup)
    document.cookie = 'fono_is_signup=false; path=/; max-age=300; SameSite=Lax'
    signIn('google', { callbackUrl: redirect || '/dashboard' })
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#FDF0E8' }}
    >
      <div className="w-full" style={{ maxWidth: 400 }}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <FonoLogo size={48} textColor="#E0602A" mode="light" />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: '#8B7355',
            textAlign: 'center',
            marginBottom: 40,
            lineHeight: 1.5,
          }}
        >
          {isKiosk ? 'Sign in to access the kiosk' : 'Sign in to manage your restaurant'}
        </p>

        {/* No-account error banner */}
        {error === 'no_account' && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: '#DC2626', marginBottom: 4 }}>
              No account found
            </p>
            <p style={{ fontSize: 13, color: '#991B1B' }}>
              You need to{' '}
              <a href="/signup" style={{ color: '#E0602A', fontWeight: 600, textDecoration: 'underline' }}>
                sign up
              </a>{' '}
              first.
            </p>
          </div>
        )}

        {/* Sign in card */}
        <div
          className="bg-white"
          style={{
            borderRadius: 24,
            padding: '40px 32px',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          }}
        >
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#1E0E00',
              textAlign: 'center',
              letterSpacing: '-0.02em',
              marginBottom: 8,
            }}
          >
            Welcome back
          </h1>
          <p
            style={{
              fontSize: 14,
              color: '#8B7355',
              textAlign: 'center',
              marginBottom: 32,
            }}
          >
            Use your Google account to get started
          </p>

          {/* Google sign in button */}
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 transition-all hover:shadow-md"
            style={{
              height: 52,
              borderRadius: 14,
              backgroundColor: '#fff',
              border: '1.5px solid rgba(0,0,0,0.1)',
              color: '#1E0E00',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Sign up link — hidden for kiosk redirects */}
          {!isKiosk && (
            <p
              style={{
                fontSize: 13,
                color: '#8B7355',
                textAlign: 'center',
                marginTop: 20,
              }}
            >
              Don&apos;t have an account?{' '}
              <a href="/signup" style={{ color: '#E0602A', fontWeight: 600 }}>
                Sign up
              </a>
            </p>
          )}
        </div>

        {/* Footer */}
        <p
          style={{
            fontSize: 12,
            color: '#B0A090',
            textAlign: 'center',
            marginTop: 32,
          }}
        >
          By signing in, you agree to Fono&apos;s Terms of Service
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
