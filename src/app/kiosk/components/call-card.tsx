'use client'

import { useState, useEffect } from 'react'
import { SLATimer } from './sla-timer'
import { timeAgo } from '@/lib/utils'

export interface KioskCall {
  id: string
  caller_phone: string
  call_status: 'NO_ANSWER' | 'COMPLETED' | 'BUSY' | 'FAILED'
  started_at: string
  duration_seconds: number | null
  callback_status: 'pending' | 'recovered' | 'ignored' | 'calling' | 'no-rest-answer' | null
  callback_at: string | null
  repeat_count: number
  sla_deadline: string | null
  sla_breached: boolean
  has_callback_number: boolean
}

interface CallCardProps {
  call: KioskCall
  dark: boolean
  variant: 'missed' | 'recovered' | 'ignored'
  selected: boolean
  onSelect?: (id: string) => void
  onCallBack?: (call: KioskCall) => void
  onIgnore?: (call: KioskCall) => void
  animateOut?: boolean
}

export function CallCard({ call, dark, variant, selected, onSelect, onCallBack, onIgnore, animateOut }: CallCardProps) {
  const isBreached = call.sla_breached || (call.sla_deadline && new Date(call.sla_deadline).getTime() < Date.now())
  const isApproaching = !isBreached && call.sla_deadline &&
    (new Date(call.sla_deadline).getTime() - Date.now()) < 5 * 60 * 1000

  // Urgency strip color
  let stripColor: string
  if (variant !== 'missed') {
    stripColor = variant === 'recovered' ? '#22C55E' : (dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
  } else if (isBreached) {
    stripColor = '#DC2626'
  } else if (isApproaching) {
    stripColor = '#D97706'
  } else {
    stripColor = '#22C55E'
  }

  // Card background
  const cardBg = dark ? '#161920' : '#FFFFFF'
  const cardBorder = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  // Shadow based on urgency
  let baseShadow: string
  if (variant === 'missed' && isBreached) {
    baseShadow = '0 2px 12px rgba(220,38,38,0.15)'
  } else if (variant === 'missed' && isApproaching) {
    baseShadow = '0 2px 8px rgba(217,119,6,0.1)'
  } else {
    baseShadow = dark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)'
  }

  const textPrimary = dark ? '#FDF0E8' : '#1E0E00'
  const textSecondary = dark ? 'rgba(253,240,232,0.5)' : '#8B7355'

  const [confirmingIgnore, setConfirmingIgnore] = useState(false)
  useEffect(() => {
    if (!selected) setConfirmingIgnore(false)
  }, [selected])

  return (
    <div
      className={animateOut ? 'kiosk-slide-out' : ''}
      onClick={() => onSelect?.(call.id)}
      style={{
        borderRadius: 14,
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: cardBg,
        border: `1px solid ${cardBorder}`,
        boxShadow: selected ? `0 0 0 2px #5B9EF4, ${baseShadow}` : baseShadow,
        transform: selected ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: variant === 'missed' ? 'pointer' : 'default',
      }}
    >
      {/* Left urgency strip */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          backgroundColor: stripColor,
        }}
      />

      {/* Repeat badge top-right */}
      {call.repeat_count > 1 && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            minWidth: 28,
            height: 22,
            borderRadius: 6,
            backgroundColor: '#EF4444',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 6px',
          }}
        >
          {call.repeat_count}×
        </span>
      )}

      {/* Content area */}
      <div style={{ padding: '14px 16px 14px 20px' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: textPrimary, lineHeight: 1.2 }}>
          {call.caller_phone}
        </div>
        <div style={{ fontSize: 12, fontWeight: 500, color: textSecondary, marginTop: 4 }}>
          {timeAgo(call.started_at)}
          {variant === 'recovered' && call.callback_at && (
            <span style={{ color: '#22C55E', marginLeft: 8 }}>
              Recovered {timeAgo(call.callback_at)}
            </span>
          )}
          {variant === 'ignored' && call.callback_at && (
            <span style={{ marginLeft: 8 }}>
              Attempted {timeAgo(call.callback_at)}
            </span>
          )}
        </div>
        {variant === 'missed' && call.sla_deadline && (
          <div style={{ marginTop: 8 }}>
            <SLATimer deadline={call.sla_deadline} breached={!!isBreached} dark={dark} />
          </div>
        )}
      </div>

      {/* Status indicator for calling/no-rest-answer */}
      {variant === 'missed' && call.callback_status === 'calling' && (
        <div style={{ padding: '8px 16px 8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3B82F6', animation: 'sla-dot-pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#3B82F6' }}>Calling customer...</span>
        </div>
      )}
      {variant === 'missed' && call.callback_status === 'no-rest-answer' && (
        <div style={{ padding: '8px 16px 8px 20px' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#D97706' }}>{"Restaurant didn't answer"}</span>
        </div>
      )}

      {/* Expandable callback + ignore buttons */}
      {variant === 'missed' && (
        <div
          style={{
            maxHeight: selected ? 96 : 0,
            overflow: 'hidden',
            transition: 'max-height 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {call.has_callback_number && onCallBack && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCallBack(call)
              }}
              disabled={call.callback_status === 'calling'}
              style={{
                width: '100%',
                height: 44,
                border: 'none',
                backgroundColor: call.callback_status === 'calling' ? '#6B7280' : '#22C55E',
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: call.callback_status === 'calling' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                letterSpacing: '0.03em',
                opacity: call.callback_status === 'calling' ? 0.6 : 1,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
              </svg>
              {call.callback_status === 'no-rest-answer' ? 'RETRY' : call.callback_status === 'calling' ? 'CALLING...' : 'CALL BACK'}
            </button>
          )}
          {onIgnore && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirmingIgnore) {
                  onIgnore(call)
                  setConfirmingIgnore(false)
                } else {
                  setConfirmingIgnore(true)
                }
              }}
              style={{
                width: '100%',
                height: 36,
                border: 'none',
                backgroundColor: confirmingIgnore ? '#EF4444' : 'transparent',
                color: confirmingIgnore ? '#fff' : textSecondary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.03em',
                transition: 'background-color 0.2s, color 0.2s',
              }}
            >
              {confirmingIgnore ? 'TAP TO CONFIRM IGNORE' : 'IGNORE'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
