'use client'

// Voicemail card for the voicemail-route kiosk (Direction A - receipt).
// Collapsed and expanded states are folded into this one component, driven
// by local state - there is no separate route or modal. Ported from
// design_handoff_voicemail_kiosk (RcpCard + RcpTicketHeader).
//
// Tap behavior (per the CD README "Interactions" table): tapping the card
// body toggles expand/collapse. The prototype's blanket stopPropagation on
// the body would have disabled that, so it is not ported; instead the
// interactive descendants - the intent stamp, the audio player, and the
// action footer - stop propagation individually so they do not also fold
// the card.

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { AudioPlayer } from './AudioPlayer'
import {
  formatDuration,
  formatExact,
  formatPhone,
  formatRelative,
  ticketId,
} from './helpers'
import { useClock } from './hooks'
import { IconCall, IconCheck, IconChevron, IconEyeOff, IconReturn } from './icons'
import { ReclassifyMenu } from './ReclassifyMenu'
import styles from './styles.module.css'
import type { IntentKey, VoicemailCardProps } from './types'

// Category accent: a single thin colored hairline under the stamped key.
// All four categories share the same stamped treatment; the accent is just
// enough signal for staff to learn at a glance.
const ACCENT_CLASS: Record<IntentKey, string> = {
  order: 'bg-rcp-terra',
  catering: 'bg-rcp-ink',
  banquet_hall: 'bg-rcp-terra',
  others: 'bg-rcp-bone',
}

type ActVariant = 'default' | 'primary' | 'ghost' | 'danger'

function actClass(variant: ActVariant, extra?: string | false): string {
  const base =
    'inline-flex min-h-[48px] items-center gap-2 rounded-md border px-3.5 font-rcp-mono text-[11px] font-bold uppercase tracking-[0.08em]'
  const variants: Record<ActVariant, string> = {
    default:
      'border-rcp-act-border text-rcp-act-fg hover:border-rcp-act-hover-border hover:bg-rcp-act-hover-bg',
    primary:
      'border-rcp-act-primary-bg bg-rcp-act-primary-bg text-rcp-act-primary-fg hover:bg-rcp-act-primary-hover-bg',
    ghost:
      'border-dashed border-rcp-act-border text-rcp-act-fg hover:border-rcp-act-hover-border hover:bg-rcp-act-hover-bg',
    danger: 'border-dashed border-rcp-danger-soft text-rcp-danger',
  }
  return cn(base, variants[variant], extra)
}

const STAMP_STAMP_CLASS = 'font-rcp-mono text-[13px] tracking-[0.02em]'

export function VoicemailCard({
  voicemail,
  index,
  categories,
  density,
  onStatusChange,
  onReclassify,
}: VoicemailCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [reclassifyOpen, setReclassifyOpen] = useState(false)
  const [hideArmed, setHideArmed] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stampRef = useRef<HTMLButtonElement>(null)
  // 0 until mounted; locale-formatted timestamps are gated on it.
  const now = useClock()

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  const vm = voicemail
  const cat = vm.intent_category_key
  const stampKey = cat ?? 'pending'
  const stampDisplay = vm.intent_category_display_at_capture ?? 'Pending'
  const repeat = vm.repeat_caller_count > 0

  // Tapping the card expands it (README "Interactions": "Collapsed ->
  // expanded inline"). It is deliberately expand-only, not a toggle: once
  // open, taps on the transcript or details must not collapse the card out
  // from under the reader. Collapsing is done with the footer COLLAPSE
  // button. Interactive descendants (stamp, audio player, footer) stop
  // propagation so they never trigger this.
  const expand = useCallback(() => setExpanded(true), [])
  const toggleExpand = useCallback(() => setExpanded((v) => !v), [])

  const onHideClick = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = undefined
    }
    if (hideArmed) {
      // Confirm-in-place: second tap commits.
      setHideArmed(false)
      onStatusChange(vm.id, 'hidden')
    } else {
      // First tap arms; auto-disarms after 3s of no second tap.
      setHideArmed(true)
      hideTimer.current = setTimeout(() => {
        setHideArmed(false)
        hideTimer.current = undefined
      }, 3000)
    }
  }, [hideArmed, onStatusChange, vm.id])

  return (
    <article
      data-density={density}
      onClick={expand}
      className={cn(styles.card, 'cursor-pointer', expanded && styles.cardExpanded)}
    >
      {/* Ticket header band */}
      <div className="relative flex items-center gap-3 border-b border-dashed border-rcp-rule px-[18px] pb-3 pt-3.5">
        <button
          ref={stampRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (cat) setReclassifyOpen((o) => !o)
          }}
          title="Tap to reclassify intent"
          aria-label="Reclassify intent"
          aria-expanded={reclassifyOpen}
          className={cn(
            styles.tap48,
            'relative inline-flex items-baseline gap-1.5 pb-1.5 pt-1 text-left hover:bg-rcp-stamp-hover',
          )}
        >
          <span className={cn(STAMP_STAMP_CLASS, 'font-semibold text-rcp-brown')}>[</span>
          <span className={cn(STAMP_STAMP_CLASS, 'font-bold text-rcp-ink')}>{stampKey}</span>
          <span className={cn(STAMP_STAMP_CLASS, 'font-semibold text-rcp-brown')}>]</span>
          <span className="ml-2 text-[15px] font-bold tracking-[-0.01em] text-rcp-ink">
            {stampDisplay}
          </span>
          {cat ? (
            <span
              aria-hidden="true"
              className={cn(
                'absolute bottom-0 left-0 right-3 h-0.5 rounded-[1px]',
                ACCENT_CLASS[cat],
              )}
            />
          ) : null}
        </button>

        <span
          aria-hidden="true"
          className="mx-1.5 h-px flex-1 self-center border-t border-dashed border-rcp-rule"
        />

        <span className="inline-flex items-center gap-1.5 font-rcp-mono text-[11px] tabular-nums text-rcp-brown">
          <span className="font-semibold tracking-[0.02em] text-rcp-text-body">
            {ticketId(index)}
          </span>
          <span className="opacity-60">&middot;</span>
          <span
            className="tracking-[0.02em]"
            title={now > 0 ? formatExact(vm.captured_at) : undefined}
          >
            {now > 0 ? formatRelative(vm.captured_at, now) : ''}
          </span>
        </span>

        <ReclassifyMenu
          open={reclassifyOpen}
          current={cat}
          categories={categories}
          triggerRef={stampRef}
          onPick={(k) => {
            onReclassify(vm.id, k)
            setReclassifyOpen(false)
          }}
          onClose={() => setReclassifyOpen(false)}
        />
      </div>

      {/* Body - tapping here toggles expand (interactive children stop it) */}
      <div className="px-[18px] pb-3 pt-3.5">
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="font-rcp-mono text-[22px] font-bold tracking-[-0.005em] tabular-nums text-rcp-text-strong">
            {formatPhone(vm.caller_phone)}
          </span>
          <span className="font-rcp-mono text-[12px] tracking-[0.03em] tabular-nums text-rcp-brown">
            {formatDuration(vm.audio_duration_seconds)}
          </span>
        </div>

        <div className="mb-3 inline-flex flex-wrap items-center gap-2 font-rcp-mono text-[11px] lowercase tracking-[0.02em] text-rcp-brown">
          {vm.caller_name ? (
            <span className="font-semibold normal-case text-rcp-text-strong">
              {vm.caller_name}
            </span>
          ) : (
            <span>new caller</span>
          )}
          {repeat ? (
            <>
              <span aria-hidden="true" className="text-rcp-bone">
                &middot;
              </span>
              <span
                className="rounded-[3px] bg-rcp-repeat-bg px-1.5 py-0.5 font-semibold text-rcp-repeat-fg"
                title={
                  now > 0 && vm.repeat_caller_last_seen
                    ? `last seen ${formatExact(vm.repeat_caller_last_seen)}`
                    : undefined
                }
              >
                returning &middot; {vm.repeat_caller_count}&times; in 30d
              </span>
            </>
          ) : null}
          {vm.callback_preference ? (
            <>
              <span aria-hidden="true" className="text-rcp-bone">
                &middot;
              </span>
              <span className="text-rcp-text-body">prefers: {vm.callback_preference}</span>
            </>
          ) : null}
        </div>

        {/* The summary is the operational answer to "what do they want". */}
        <p className="mb-3.5 mt-1 text-[17px] font-medium leading-[1.45] tracking-[-0.005em] text-rcp-text-strong [text-wrap:pretty]">
          {vm.summary}
        </p>

        {/* Audio sits on every card so staff can hit play instantly. */}
        <div onClick={(e) => e.stopPropagation()}>
          <AudioPlayer
            audioUrl={vm.audio_url}
            durationSeconds={vm.audio_duration_seconds}
          />
        </div>

        {expanded ? (
          <div className="pt-1">
            <div className="mb-2.5 mt-[18px] flex items-center gap-2.5 font-rcp-mono text-[10px] uppercase tracking-[0.15em] text-rcp-brown before:h-0 before:flex-1 before:border-t before:border-dashed before:border-rcp-rule before:content-[''] after:h-0 after:flex-1 after:border-t after:border-dashed after:border-rcp-rule after:content-['']">
              <span>full transcript</span>
            </div>
            <p className="m-0 text-[14.5px] leading-[1.6] text-rcp-text-body [text-wrap:pretty]">
              {vm.transcript}
            </p>

            {vm.structured_details_json ? (
              <>
                <div className="mb-2.5 mt-[18px] flex items-center gap-2.5 font-rcp-mono text-[10px] uppercase tracking-[0.15em] text-rcp-brown before:h-0 before:flex-1 before:border-t before:border-dashed before:border-rcp-rule before:content-[''] after:h-0 after:flex-1 after:border-t after:border-dashed after:border-rcp-rule after:content-['']">
                  <span>extracted details</span>
                </div>
                <dl className="m-0 grid gap-1">
                  {Object.entries(vm.structured_details_json).map(([k, v]) => (
                    <div
                      key={k}
                      className="grid grid-cols-[140px_1fr] gap-3 py-0.5 font-rcp-mono text-[12px]"
                    >
                      <dt className="text-[10px] uppercase tracking-[0.04em] text-rcp-brown">
                        {k.replace(/_/g, ' ')}
                      </dt>
                      <dd className="m-0 tabular-nums text-rcp-text-strong">
                        {Array.isArray(v) ? v.join(', ') : String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Action footer */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          styles.cardFoot,
          'flex flex-wrap items-center gap-1.5 border-t border-dashed border-rcp-rule px-3 pb-3 pt-2.5',
        )}
      >
        {vm.status === 'new' ? (
          <>
            <button
              type="button"
              onClick={() => onStatusChange(vm.id, 'resolved')}
              className={actClass('primary')}
            >
              <IconCheck w={14} h={14} />
              <span>RESOLVE</span>
            </button>
            <a
              href={`tel:${vm.caller_phone}`}
              className={actClass('default')}
              aria-label={`Call back ${formatPhone(vm.caller_phone)}`}
            >
              <IconCall w={14} h={14} />
              <span>CALL BACK</span>
            </a>
            <button
              type="button"
              onClick={toggleExpand}
              aria-expanded={expanded}
              className={actClass('ghost')}
            >
              <span
                className={cn(
                  'inline-flex transition-transform duration-[180ms]',
                  expanded && 'rotate-180',
                )}
              >
                <IconChevron w={14} h={14} />
              </span>
              <span>{expanded ? 'COLLAPSE' : 'EXPAND'}</span>
            </button>
            {expanded ? (
              <button
                type="button"
                onClick={onHideClick}
                className={actClass(
                  'danger',
                  hideArmed && 'border-solid border-rcp-danger bg-rcp-danger text-white',
                )}
              >
                {hideArmed ? 'TAP TO CONFIRM HIDE' : 'HIDE'}
              </button>
            ) : null}
          </>
        ) : null}

        {vm.status === 'resolved' ? (
          <>
            <span className="mr-auto inline-flex items-center gap-1.5 rounded border border-rcp-success-soft px-2.5 py-1.5 font-rcp-mono text-[11px] font-bold uppercase tracking-[0.12em] text-rcp-success">
              <IconCheck w={12} h={12} />
              <span>
                RESOLVED
                {vm.resolved_at && now > 0
                  ? ` · ${formatRelative(vm.resolved_at, now)}`
                  : ''}
                {vm.resolved_by ? ` · ${vm.resolved_by}` : ''}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onStatusChange(vm.id, 'new')}
              className={actClass('ghost')}
            >
              <IconReturn w={14} h={14} />
              <span>REOPEN</span>
            </button>
          </>
        ) : null}

        {vm.status === 'hidden' ? (
          <>
            <span className="mr-auto inline-flex items-center gap-1.5 rounded border border-dashed border-rcp-rule px-2.5 py-1.5 font-rcp-mono text-[11px] font-bold uppercase tracking-[0.12em] text-rcp-brown">
              <IconEyeOff w={12} h={12} />
              <span>HIDDEN{vm.hidden_reason ? ` · ${vm.hidden_reason}` : ''}</span>
            </span>
            <button
              type="button"
              onClick={() => onStatusChange(vm.id, 'new')}
              className={actClass('ghost')}
            >
              <IconReturn w={14} h={14} />
              <span>RESTORE</span>
            </button>
          </>
        ) : null}
      </div>
    </article>
  )
}
