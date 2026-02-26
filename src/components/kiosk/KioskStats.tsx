'use client'

import { useState, useEffect } from 'react'
import { fetchSummary, DashboardSummary } from '@/lib/api'
import { config } from '@/lib/config'

export default function KioskStats() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)

  useEffect(() => {
    const load = () => {
      fetchSummary(config.defaultTenantId, 1).then(setSummary).catch(() => {})
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  if (!summary) return null

  return (
    <div className="flex items-center justify-center gap-8 sm:gap-16">
      <div className="text-center">
        <p className="text-3xl font-bold text-white">{summary.total_calls}</p>
        <p className="text-sm text-white/50">Calls Today</p>
      </div>
      <div className="w-px h-10 bg-white/20" />
      <div className="text-center">
        <p className="text-3xl font-bold text-terra">{summary.missed_calls}</p>
        <p className="text-sm text-white/50">Missed Today</p>
      </div>
      <div className="w-px h-10 bg-white/20" />
      <div className="text-center">
        <p className="text-3xl font-bold text-green-500">{summary.answered_calls}</p>
        <p className="text-sm text-white/50">Answered</p>
      </div>
    </div>
  )
}
