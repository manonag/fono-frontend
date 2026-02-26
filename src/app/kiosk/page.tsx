'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchCalls, Call } from '@/lib/api'
import { config } from '@/lib/config'
import { useCallEvents } from '@/hooks/useCallEvents'
import KioskClock from '@/components/kiosk/KioskClock'
import KioskStats from '@/components/kiosk/KioskStats'
import LiveCallCard from '@/components/kiosk/LiveCallCard'

export default function KioskPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const { latestEvent, connected } = useCallEvents(config.defaultTenantId)

  const loadCalls = useCallback(async () => {
    try {
      const data = await fetchCalls(config.defaultTenantId, { page: 1, per_page: 3 })
      setCalls(data.calls)
    } catch {
      /* silently retry on next interval */
    }
  }, [])

  useEffect(() => {
    loadCalls()
    const interval = setInterval(loadCalls, 15000)
    return () => clearInterval(interval)
  }, [loadCalls])

  // Refresh when new events come in
  useEffect(() => {
    if (latestEvent) {
      loadCalls()
    }
  }, [latestEvent, loadCalls])

  return (
    <div className="h-screen bg-ink flex flex-col overflow-hidden select-none">
      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white">Spice Garden</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-white/40 font-medium">Fono Live</span>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-yellow-500'}`} />
          </div>
        </div>
        <KioskClock />
      </header>

      {/* Main call cards */}
      <main className="flex-1 px-8 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
        {calls.length === 0 ? (
          <div className="col-span-3 flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-xl text-white/30 font-medium">No recent calls</p>
              <p className="text-sm text-white/20 mt-1">Calls will appear here in real time</p>
            </div>
          </div>
        ) : (
          calls.map((call, i) => <LiveCallCard key={call.id} call={call} index={i} />)
        )}
      </main>

      {/* Bottom stats bar */}
      <footer className="px-8 py-4 border-t border-white/10 flex-shrink-0">
        <KioskStats />
      </footer>
    </div>
  )
}
