'use client'

import { useState, useEffect } from 'react'

interface SLATimerProps {
  deadline: string | null
  breached: boolean
  dark: boolean
}

export function SLATimer({ deadline, breached, dark }: SLATimerProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!deadline) return null

  const deadlineMs = new Date(deadline).getTime()
  const diffMs = deadlineMs - now
  const isOverdue = diffMs < 0 || breached
  const absDiff = Math.abs(diffMs)
  const totalSeconds = Math.floor(absDiff / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

  const approaching = !isOverdue && diffMs < 5 * 60 * 1000

  // Colors
  let dotColor: string
  let textColor: string
  let pillBg: string
  if (isOverdue) {
    dotColor = '#EF4444'
    textColor = '#EF4444'
    pillBg = dark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)'
  } else if (approaching) {
    dotColor = '#D97706'
    textColor = '#D97706'
    pillBg = dark ? 'rgba(217,119,6,0.12)' : 'rgba(217,119,6,0.08)'
  } else {
    dotColor = dark ? 'rgba(253,240,232,0.35)' : '#8B7355'
    textColor = dark ? 'rgba(253,240,232,0.5)' : '#8B7355'
    pillBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
  }

  const shouldPulse = isOverdue || approaching

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px 3px 8px',
        borderRadius: 9999,
        backgroundColor: pillBg,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
          animation: shouldPulse ? 'sla-dot-pulse 1.2s ease-in-out infinite' : 'none',
        }}
      />
      <span
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: textColor,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {isOverdue ? `${timeStr} late` : `${timeStr} left`}
      </span>
    </div>
  )
}
