'use client'

import { useState, useEffect } from 'react'
import { fetchSummary, DashboardSummary } from '@/lib/api'
import { config } from '@/lib/config'
import { formatDurationLong } from '@/lib/utils'
import { useCallEvents } from '@/hooks/useCallEvents'
import SummaryCard from '@/components/SummaryCard'
import CallList from '@/components/CallList'
import LiveBanner from '@/components/LiveBanner'

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { latestEvent, connected } = useCallEvents(config.defaultTenantId)

  useEffect(() => {
    fetchSummary(config.defaultTenantId)
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load summary'))
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <header className="bg-terra-dark text-white px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">Fono</h1>
            <span className="text-white/60 hidden sm:inline">|</span>
            <span className="text-white/80 text-sm hidden sm:inline">Spice Garden</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-white/60 text-sm hidden sm:inline">{today}</span>
            <div className="flex items-center gap-1.5" title={connected ? 'Live connected' : 'Connecting...'}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
              <span className="text-xs text-white/60">{connected ? 'Live' : '...'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Live banner */}
        <LiveBanner latestEvent={latestEvent} />

        {/* Mobile restaurant name */}
        <div className="sm:hidden">
          <h2 className="text-lg font-bold text-ink">Spice Garden</h2>
          <p className="text-sm text-brown-light">{today}</p>
        </div>

        {/* Summary cards */}
        {error && (
          <div className="bg-orange-50 border border-orange-200 text-terra rounded-xl p-4 text-sm">{error}</div>
        )}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-warm-border animate-pulse" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <SummaryCard title="Total Calls" value={summary.total_calls} subtitle="Last 30 days" delay={0} />
            <SummaryCard
              title="Missed Calls"
              value={summary.missed_calls}
              subtitle="Last 30 days"
              accent={summary.missed_calls > 0 ? 'red' : 'default'}
              delay={50}
            />
            <SummaryCard
              title="Answered"
              value={summary.answered_calls}
              subtitle="Last 30 days"
              accent="green"
              delay={100}
            />
            <SummaryCard
              title="Total Duration"
              value={formatDurationLong(summary.total_duration_seconds)}
              subtitle="Last 30 days"
              delay={150}
            />
            <SummaryCard title="Recordings" value={summary.total_recordings} subtitle="Last 30 days" delay={200} />
          </div>
        ) : null}

        {/* Call log */}
        <CallList />
      </main>
    </div>
  )
}
