'use client'

import { useCallback, useEffect, useState } from 'react'
import { useFonoToken } from '@/hooks/use-fono-token'
import { fetchMe } from '@/app/admin/labeling/lib/api'
import { LabelingApiError } from '@/app/admin/labeling/lib/api'
import type { LabelerSummary, MeResponse } from '@/app/admin/labeling/lib/types'
import {
  UsersApiError,
  addLabeler,
  fetchUsers,
  removeLabeler,
} from './lib/api'

type AuthState = 'loading' | 'allowed' | 'denied' | 'unauthenticated' | 'not_owner'

function formatRelative(iso: string | null): string {
  if (!iso) return 'never'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}

export default function AdminUsersPage() {
  const token = useFonoToken()
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [me, setMe] = useState<MeResponse | null>(null)
  const [users, setUsers] = useState<LabelerSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (token === undefined) return
    if (!token) {
      setAuthState('unauthenticated')
      return
    }
    let cancelled = false
    fetchMe(token)
      .then((data) => {
        if (cancelled) return
        setMe(data)
        if (data.role === 'owner') {
          setAuthState('allowed')
        } else {
          setAuthState('not_owner')
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        if (err instanceof LabelingApiError && err.status === 403) {
          setAuthState('denied')
        } else {
          setAuthState('unauthenticated')
        }
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const loadUsers = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetchUsers(token)
      setUsers(res.users)
    } catch (err) {
      const msg = err instanceof UsersApiError ? err.detail : 'Failed to load users'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (authState !== 'allowed') return
    void loadUsers()
  }, [authState, loadUsers])

  const onAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!token) return
      const email = formEmail.trim()
      const name = formName.trim()
      if (!email || !name) {
        setFormError('Email and name are both required')
        return
      }
      setSubmitting(true)
      setFormError(null)
      setFormSuccess(null)
      try {
        await addLabeler(token, { email, name })
        setFormEmail('')
        setFormName('')
        setFormSuccess(`Added ${email}`)
        await loadUsers()
      } catch (err) {
        const msg = err instanceof UsersApiError ? err.detail : 'Add failed'
        setFormError(msg)
      } finally {
        setSubmitting(false)
      }
    },
    [token, formEmail, formName, loadUsers],
  )

  const onRemove = useCallback(
    async (user: LabelerSummary) => {
      if (!token) return
      if (me && user.id === me.user_id) return
      const ok = window.confirm(
        `Remove ${user.name || user.email}? They will lose access immediately. Their labeling history is preserved for audit.`,
      )
      if (!ok) return
      try {
        await removeLabeler(token, user.id)
        await loadUsers()
      } catch (err) {
        const msg = err instanceof UsersApiError ? err.detail : 'Remove failed'
        setError(msg)
      }
    },
    [token, me, loadUsers],
  )

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
          Your account does not have access to the Fono admin dashboard.
        </p>
      </main>
    )
  }
  if (authState === 'not_owner') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <h1 className="text-2xl font-bold mb-2">Owner only</h1>
        <p className="text-brown">
          Only owners can manage labelers. Contact Mano if you need access.
        </p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream text-ink font-sans">
      <header className="bg-ink text-cream px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold">Labelers</h1>
            <p className="text-xs text-cream/70">
              T-204 Phase C.2-mini · multi-user labeling allowlist
            </p>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <a href="/admin/labeling" className="text-cream/70 hover:text-cream underline">
              ← Labeling queue
            </a>
            <a
              href="/admin/labeling/review"
              className="text-cream/70 hover:text-cream underline"
            >
              Review queue
            </a>
            <a href="/admin" className="text-cream/70 hover:text-cream underline">
              Admin home
            </a>
          </nav>
        </div>
      </header>

      <section className="p-6 max-w-5xl">
        <h2 className="text-lg font-bold mb-3">Add labeler</h2>
        <form
          onSubmit={onAdd}
          className="bg-white rounded-md shadow-sm border border-ink/10 p-4 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <label className="block">
              <span className="block text-xs font-semibold text-ink mb-1">
                Gmail address
              </span>
              <input
                type="email"
                required
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="mourya@gmail.com"
                className="w-full px-3 py-2 border border-ink/20 rounded text-sm"
                disabled={submitting}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-ink mb-1">
                Display name
              </span>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Mourya"
                className="w-full px-3 py-2 border border-ink/20 rounded text-sm"
                disabled={submitting}
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-terra text-white text-sm font-semibold hover:bg-terra-dark disabled:opacity-50"
            >
              {submitting ? 'Adding…' : 'Add labeler'}
            </button>
          </div>
          {formError && (
            <p className="text-red-700 text-xs mt-3">{formError}</p>
          )}
          {formSuccess && (
            <p className="text-green-700 text-xs mt-3">{formSuccess}</p>
          )}
          <p className="text-brown text-xs mt-3">
            New labelers can sign in immediately with this Gmail address. Role is
            always &quot;labeler&quot;; owner promotion requires manual SQL.
          </p>
        </form>

        <h2 className="text-lg font-bold mb-3">All labelers</h2>
        {error && (
          <div className="mb-4 p-3 rounded bg-red-100 text-red-800 text-sm">{error}</div>
        )}
        {loading && users.length === 0 && (
          <p className="text-brown text-sm">Loading…</p>
        )}
        {!loading && users.length === 0 && !error && (
          <p className="text-brown text-sm">No labelers yet.</p>
        )}
        {users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-sm bg-white rounded-md shadow-sm">
              <thead className="bg-ink/5 text-left">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Role</th>
                  <th className="p-2 text-right">Verified</th>
                  <th className="p-2 text-right">In review</th>
                  <th className="p-2 text-right">Rejected</th>
                  <th className="p-2">Last active</th>
                  <th className="p-2">Joined</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = me && u.id === me.user_id
                  return (
                    <tr key={u.id} className="border-t border-ink/10">
                      <td className="p-2 font-semibold">
                        {u.name || '—'}
                        {isSelf && (
                          <span className="ml-2 text-[10px] uppercase text-brown">
                            you
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-brown font-mono text-xs">{u.email}</td>
                      <td className="p-2">
                        <span
                          className={
                            u.role === 'owner'
                              ? 'px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-800'
                              : 'px-1.5 py-0.5 rounded text-[10px] font-semibold bg-ink/5 text-ink'
                          }
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-2 text-right font-semibold text-green-700">
                        {u.counts.verified}
                      </td>
                      <td className="p-2 text-right font-semibold text-amber-700">
                        {u.counts.in_review}
                      </td>
                      <td className="p-2 text-right text-brown">
                        {u.counts.rejected}
                      </td>
                      <td
                        className="p-2 text-brown"
                        title={u.last_active_at ?? ''}
                      >
                        {formatRelative(u.last_active_at)}
                      </td>
                      <td className="p-2 text-brown">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="p-2 text-right">
                        <button
                          type="button"
                          onClick={() => void onRemove(u)}
                          disabled={Boolean(isSelf) || u.role === 'owner'}
                          className="text-red-700 hover:underline disabled:text-brown/50 disabled:no-underline disabled:cursor-not-allowed text-xs"
                          title={
                            isSelf
                              ? 'Cannot remove your own account'
                              : u.role === 'owner'
                                ? 'Owners cannot be removed via UI (manual SQL)'
                                : 'Soft-delete this labeler'
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
