// /admin/insights -- Tara Insights dashboard (sprint 1610b462).
// Client component. Mirrors the admin/page.tsx auth-state pattern: check
// /api/v1/admin/me on mount, render an inline denied/unauthenticated
// state (there is no /admin route middleware redirect in this app), and
// only mount the data sections once allowed.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { config } from '@/lib/config'
import { useFonoToken } from '@/hooks/use-fono-token'
import { HotLeadsSection } from './components/HotLeadsSection'
import { ConversationsSection } from './components/ConversationsSection'

type AuthState = 'loading' | 'allowed' | 'denied' | 'unauthenticated'

export default function AdminInsightsPage() {
  const token = useFonoToken()
  const [authState, setAuthState] = useState<AuthState>('loading')

  useEffect(() => {
    if (token === undefined) return
    if (!token) {
      setAuthState('unauthenticated')
      return
    }
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (cancelled) return
        if (r.status === 200) setAuthState('allowed')
        else if (r.status === 403) setAuthState('denied')
        else setAuthState('unauthenticated')
      })
      .catch(() => {
        if (!cancelled) setAuthState('denied')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  if (authState === 'loading') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <p className="text-brown">Checking access...</p>
      </main>
    )
  }
  if (authState === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <p>You need to sign in to view this page.</p>
      </main>
    )
  }
  if (authState === 'denied') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <h1 className="text-2xl font-bold mb-2">No admin access</h1>
        <p className="text-brown">
          Your account does not have access to the Fono admin dashboard. If
          you believe this is wrong, contact Mano.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream text-ink font-sans">
      <header className="bg-ink text-cream px-6 py-4">
        <Link
          href="/admin"
          className="inline-block text-xs text-cream/70 hover:text-cream underline mb-1"
        >
          ← Back to Admin
        </Link>
        <h1 className="text-xl font-bold">Tara Insights</h1>
        <p className="text-xs text-cream/70">
          Hot leads and analyzed visitor conversations from the Tara chat
          widget
        </p>
      </header>

      {token && <HotLeadsSection token={token} />}
      {token && <ConversationsSection token={token} />}
    </main>
  )
}
