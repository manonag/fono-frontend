'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { config } from '@/lib/config'

export interface AdminTenantOption {
  tenant_id: string
  tenant_name: string
  owner_email: string | null
  is_demo: boolean
}

interface TenantSelectorProps {
  token: string
  includeDemo: boolean
  onTenantsLoaded?: (tenants: AdminTenantOption[]) => void
}

export function TenantSelector({
  token,
  includeDemo,
  onTenantsLoaded,
}: TenantSelectorProps) {
  const [tenants, setTenants] = useState<AdminTenantOption[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    fetch(`${config.apiUrl}/api/v1/admin/tenants?include_demo=${includeDemo}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((json: { tenants: AdminTenantOption[] }) => {
        if (cancelled) return
        setTenants(json.tenants)
        if (onTenantsLoaded) onTenantsLoaded(json.tenants)
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Unknown error')
      })
    return () => {
      cancelled = true
    }
  }, [token, includeDemo, onTenantsLoaded])

  return (
    <section className="px-6 py-3 border-b border-ink/10 bg-white">
      <div className="flex items-center gap-3 flex-wrap">
        <label htmlFor="admin-tenant-select" className="text-sm font-semibold">
          Viewing as:
        </label>
        <select
          id="admin-tenant-select"
          className="text-sm border border-ink/20 rounded px-2 py-1 bg-white"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">-- choose tenant --</option>
          {tenants.map((t) => (
            <option key={t.tenant_id} value={t.tenant_id}>
              {t.tenant_name}
              {t.is_demo ? ' [demo]' : ''}
              {t.owner_email ? ` (${t.owner_email})` : ''}
            </option>
          ))}
        </select>
        {selectedId ? (
          <Link
            href={`/admin/view-as/${selectedId}?tab=dashboard`}
            className="text-sm bg-terra text-white px-3 py-1 rounded hover:bg-terra-dark"
          >
            Open view-as panel
          </Link>
        ) : (
          <span className="text-sm bg-gray-200 text-gray-500 px-3 py-1 rounded cursor-not-allowed">
            Open view-as panel
          </span>
        )}
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    </section>
  )
}
