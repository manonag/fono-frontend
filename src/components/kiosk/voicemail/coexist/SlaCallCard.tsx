'use client'

// Receipt-skinned live-call card for the coexistence kiosk (CD handoff
// coexistence/coexist.jsx SlaCallCard, CHIRAN arch fact #362). SKIN ONLY: the
// functional layout is the existing SLA design — left urgency stripe (green /
// amber / red / sage / bone by SLA state), green CALL BACK, IGNORE secondary —
// re-surfaced onto the Layout C receipt system (warm paper, perforated edge,
// dashed rules, mono numerals) so all four kiosk tabs read as one product.
//
// Data is the real KioskCall (kiosk/components/call-card.tsx), not redesigned.
// Recovered / ignored render as read-only records, matching the current SLA
// kiosk (no backend reopen action exists). CALL BACK / IGNORE are wired to the
// same callback endpoint as the standalone SLA kiosk.

import { useState, useEffect } from 'react'
import type { KioskCall } from '@/app/kiosk/components/call-card'
import { formatCallTime } from '@/lib/utils'
import { formatPhone, formatDuration } from '../helpers'
import { IconCall, IconCheck, IconClock, IconEyeOff } from '../icons'
import styles from './coexist.module.css'

interface SlaCallCardProps {
  call: KioskCall
  variant: 'missed' | 'recovered' | 'ignored'
  now: number
  tenantTimezone: string
  onCallBack?: (call: KioskCall) => void
  onIgnore?: (call: KioskCall) => void
}

export function SlaCallCard({
  call,
  variant,
  now,
  tenantTimezone,
  onCallBack,
  onIgnore,
}: SlaCallCardProps) {
  const [confirmingIgnore, setConfirmingIgnore] = useState(false)
  useEffect(() => {
    // Reset the two-tap confirm if the card leaves the calling state.
    if (call.callback_status === 'calling') setConfirmingIgnore(false)
  }, [call.callback_status])

  const deadlineMs = call.sla_deadline ? new Date(call.sla_deadline).getTime() : null
  const isBreached = call.sla_breached || (deadlineMs !== null && deadlineMs < now)
  const isApproaching = !isBreached && deadlineMs !== null && deadlineMs - now < 5 * 60 * 1000
  const remaining = deadlineMs !== null ? Math.max(0, Math.floor((deadlineMs - now) / 1000)) : null

  const stripeColor =
    variant === 'recovered'
      ? '#16A34A'
      : variant === 'ignored'
        ? '#B0A090'
        : isBreached
          ? '#DC2626'
          : isApproaching
            ? '#D97706'
            : '#22C55E'

  const started = formatCallTime(call.started_at, tenantTimezone)
  const isCalling = call.callback_status === 'calling'

  return (
    <article className={styles.slaCard} data-status={variant}>
      <span className={styles.slaStripe} style={{ background: stripeColor }} />

      <div className={styles.slaCardBody}>
        <div className={styles.slaPhone}>{formatPhone(call.caller_phone)}</div>

        <div className={styles.slaMeta} title={started.absolute}>
          <span>{started.combined}</span>
          {call.repeat_count > 1 ? (
            <>
              <span className={styles.slaDot}>·</span>
              <span className={styles.slaRepeat}>{call.repeat_count}× repeat</span>
            </>
          ) : null}
        </div>

        {variant === 'missed' ? (
          <div className={styles.slaStatus} style={{ color: stripeColor }}>
            <IconClock w={12} h={12} />
            {isBreached
              ? 'SLA breached'
              : isCalling
                ? 'Calling customer…'
                : remaining !== null
                  ? `${formatDuration(remaining)} to call back`
                  : 'Awaiting call back'}
          </div>
        ) : null}
        {variant === 'recovered' ? (
          <div className={styles.slaStatus} style={{ color: '#16A34A' }}>
            <IconCheck w={12} h={12} /> Recovered
          </div>
        ) : null}
        {variant === 'ignored' ? (
          <div className={styles.slaStatus} style={{ color: '#8B7355' }}>
            <IconEyeOff w={12} h={12} /> Ignored
          </div>
        ) : null}
      </div>

      {variant === 'missed' ? (
        <div className={styles.slaActions}>
          {call.has_callback_number && onCallBack ? (
            <button
              className={styles.slaCta}
              disabled={isCalling}
              onClick={() => onCallBack(call)}
            >
              <IconCall w={15} h={15} />{' '}
              {isCalling ? 'Calling…' : call.callback_status === 'no-rest-answer' ? 'Retry' : 'Call back'}
            </button>
          ) : null}
          {onIgnore ? (
            <button
              className={styles.slaIgnore}
              data-confirming={confirmingIgnore ? 'true' : undefined}
              onClick={() => {
                if (confirmingIgnore) {
                  onIgnore(call)
                  setConfirmingIgnore(false)
                } else {
                  setConfirmingIgnore(true)
                }
              }}
            >
              {confirmingIgnore ? 'Confirm' : 'Ignore'}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
