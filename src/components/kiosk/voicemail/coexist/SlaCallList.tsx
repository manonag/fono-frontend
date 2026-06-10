'use client'

// Live-call grid for one SLA tab (missed / recovered / ignored) in the
// coexistence kiosk (CD handoff coexistence/coexist.jsx SlaCallList). Receipt-
// skinned 2-up grid + per-tab empty states, matching the voicemail surface.

import type { KioskCall } from '@/app/kiosk/components/call-card'
import { SlaCallCard } from './SlaCallCard'
import styles from './coexist.module.css'

type LiveTab = 'missed' | 'recovered' | 'ignored'

const EMPTY_COPY: Record<LiveTab, { t: string; s: string }> = {
  missed: {
    t: 'No missed calls right now.',
    s: "When a customer calls and you don't pick up, they'll show up here with a callback timer.",
  },
  recovered: {
    t: 'Nothing recovered yet today.',
    s: 'Calls you return land here for the record.',
  },
  ignored: {
    t: 'No ignored calls.',
    s: 'Calls you dismiss without calling back stay here.',
  },
}

interface SlaCallListProps {
  calls: KioskCall[]
  tab: LiveTab
  now: number
  tenantTimezone: string
  onCallBack?: (call: KioskCall) => void
  onIgnore?: (call: KioskCall) => void
}

export function SlaCallList({
  calls,
  tab,
  now,
  tenantTimezone,
  onCallBack,
  onIgnore,
}: SlaCallListProps) {
  if (calls.length === 0) {
    const copy = EMPTY_COPY[tab]
    return (
      <div className={styles.slaGrid}>
        <div className={styles.slaEmpty}>
          <div className={styles.slaEmptyMark}>
            <span />
            <span />
            <span />
          </div>
          <h3>{copy.t}</h3>
          <p>{copy.s}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.slaGrid}>
      {calls.map((call) => (
        <SlaCallCard
          key={call.id}
          call={call}
          variant={tab}
          now={now}
          tenantTimezone={tenantTimezone}
          onCallBack={tab === 'missed' ? onCallBack : undefined}
          onIgnore={tab === 'missed' ? onIgnore : undefined}
        />
      ))}
    </div>
  )
}
