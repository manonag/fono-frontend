'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchCalls, Call, PaginatedCalls } from '@/lib/api'
import { config } from '@/lib/config'
import CallRow from './CallRow'
import FilterPills from './FilterPills'

export default function CallList() {
  const [calls, setCalls] = useState<Call[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCalls = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: { page: number; per_page: number; status?: string } = {
        page,
        per_page: 20,
      }
      if (filter !== 'all') params.status = filter
      const data: PaginatedCalls = await fetchCalls(config.defaultTenantId, params)
      setCalls(data.calls)
      setTotalPages(data.total_pages)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calls')
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => {
    loadCalls()
  }, [loadCalls])

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">Call Log</h2>
        <FilterPills active={filter} onChange={handleFilterChange} />
      </div>

      {error && (
        <div className="bg-orange-50 border border-orange-200 text-terra rounded-xl p-4 text-sm">
          {error}
          <button onClick={loadCalls} className="ml-2 underline font-medium">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl border border-warm-border animate-pulse" />
          ))}
        </div>
      ) : calls.length === 0 ? (
        <div className="text-center py-12 text-brown-light">
          <p className="text-lg font-medium">No calls found</p>
          <p className="text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <CallRow key={call.id} call={call} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-warm-border text-brown hover:bg-cream-secondary disabled:opacity-40 transition-all"
          >
            Previous
          </button>
          <span className="text-sm text-brown-light px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-warm-border text-brown hover:bg-cream-secondary disabled:opacity-40 transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
