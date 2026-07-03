'use client'

// Voicemail card for the Layout C voicemail kiosk (v2.3 - binder-tab).
//
// Full rewrite from the v1 receipt card. The card is now content-first:
// the LLM summary is the visual hero (17px sans 600), the phone number is
// demoted to a 12.5px mono byline. The header band is a single row - a
// colored swatch + category word (the reclassify trigger) on the left, a
// 3-icon action cluster on the right - and is tinted per category via the
// [data-c] CSS hook in styles.module.css.
//
// Both the normal and the processing state live in this one component
// (the v1 ProcessingCard.tsx is left untouched but unreferenced - the
// implementation brief's flag-A resolution). All hooks are called
// unconditionally; the processing branch is an early return AFTER the hook
// list so a voicemail that finishes transcribing mid-mount does not change
// the hook order.
//
// Tap behavior: only the card *chrome* - the structural wrappers marked
// `data-card-chrome` (the header band, the body wrapper, the foot caption) -
// toggles expand. Card *content* (summary, transcript, the action buttons,
// the reclassify popover, the audio player) is inert for the toggle: tapping
// it is for reading or acting, never for folding the card. The <article>
// onClick gates on `e.target`, which is robust where the earlier
// per-descendant stopPropagation web missed cases - the reclassify popover,
// and the always-rendered body rows when the card is expanded.
//
// CALL is confirm-in-place: the first tap arms the phone icon red and shows
// the CallArmBar; a second tap within 3s fires the tel: link (the production
// stand-in for the prototype's openCallbackDial); it auto-disarms after 3s.

import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { AudioPlayer } from './AudioPlayer'
import { CallArmBar } from './CallArmBar'
import { HeaderIconBtn } from './HeaderIconBtn'
import {
  formatClock,
  formatDuration,
  formatExact,
  formatPhone,
  formatRelative,
  formatWhen,
  effectiveCategory,
  isProcessing,
  ticketId,
} from './helpers'
import { useClock, useTypewriter } from './hooks'
import { IconBlock, IconCall, IconChevron, IconCheck, IconEyeOff, IconReturn } from './icons'
import { ReclassifyMenu } from './ReclassifyMenu'
import styles from './styles.module.css'
import punch from './punch.module.css'
import type { Voicemail, VoicemailCardProps } from './types'

// T-418 item 8: categories that get the high-value treatment (config default;
// per-tenant later).
const HV_CATEGORIES = new Set(['order', 'catering', 'banquet_hall'])

// 9.5px mono caption at the bottom of every card: ticket id + capture time +
// relative time. The least-important info, smallest treatment. Inlined here
// per the implementation brief's component list (no separate FootCaption.tsx).
function FootCaption({
  vm,
  index,
  now,
}: {
  vm: Voicemail
  index: number
  now: number
}) {
  return (
    // Chrome: the caption strip is a structural wrapper, so tapping it
    // toggles expand (harmless on the processing card, whose article has
    // no onClick). data-card-chrome is read by VoicemailCard's e.target gate.
    <div className={styles.footCaption} data-card-chrome>
      <span>{ticketId(index)}</span>
      <span aria-hidden="true" className={styles.footCaptionDot}>
        &middot;
      </span>
      <span>captured {now > 0 ? formatClock(vm.captured_at) : ''}</span>
      <span aria-hidden="true" className={styles.footCaptionDot}>
        &middot;
      </span>
      <span>{now > 0 ? formatRelative(vm.captured_at, now) : ''}</span>
    </div>
  )
}

export function VoicemailCard({
  voicemail,
  index,
  categories,
  onStatusChange,
  onReclassify,
  readOnly = false,
  onCall,
  punch: punchOn = false,
  onSpamRequest,
  onUnblockRequest,
  justArrived = false,
  onSeen,
}: VoicemailCardProps) {
  const vm = voicemail
  const processing = isProcessing(vm)

  // All hooks unconditional - the processing branch returns AFTER this list.
  const now = useClock()
  const [expanded, setExpanded] = useState(false)
  const [reclassifyOpen, setReclassifyOpen] = useState(false)
  const [hideArmed, setHideArmed] = useState(false)
  const [callArmed, setCallArmed] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const callTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const stampRef = useRef<HTMLButtonElement>(null)
  // Disabled (returns the full string, no interval) for non-processing cards.
  const typed = useTypewriter('Transcribing the voicemail', 22, processing)

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
      if (callTimer.current) clearTimeout(callTimer.current)
    }
  }, [])

  // Two-tap HIDE with 3s auto-disarm (unchanged pattern from v1).
  const onHideClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (hideTimer.current) {
        clearTimeout(hideTimer.current)
        hideTimer.current = undefined
      }
      if (hideArmed) {
        setHideArmed(false)
        onStatusChange(vm.id, 'hidden')
      } else {
        setHideArmed(true)
        hideTimer.current = setTimeout(() => {
          setHideArmed(false)
          hideTimer.current = undefined
        }, 3000)
      }
    },
    [hideArmed, onStatusChange, vm.id],
  )

  // Confirm-in-place CALL: first tap arms, second tap within 3s dials.
  const armCall = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (callTimer.current) {
        clearTimeout(callTimer.current)
        callTimer.current = undefined
      }
      if (callArmed) {
        setCallArmed(false)
        // Second tap commits: fire the tel: link (brief section 3).
        window.location.href = `tel:${vm.caller_phone}`
      } else {
        setCallArmed(true)
        callTimer.current = setTimeout(() => setCallArmed(false), 3000)
      }
    },
    [callArmed, vm.caller_phone],
  )

  // Expand toggle, gated on e.target: only the card *chrome* (a structural
  // wrapper marked data-card-chrome, or the bare <article>) folds the card.
  // Content - summary, transcript, action buttons, the reclassify popover,
  // the audio player - is inert. This replaces the v1-style per-descendant
  // stopPropagation web, which missed the popover and the expanded body.
  const handleCardClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    const t = e.target
    if (
      t === e.currentTarget ||
      (t instanceof HTMLElement && t.hasAttribute('data-card-chrome'))
    ) {
      setExpanded((v) => !v)
    }
  }, [])

  // T-418: clear this card's arrival state on any tap (punch surface only).
  const clearArrival = useCallback(() => {
    if (punchOn && justArrived) onSeen?.(vm.id)
  }, [punchOn, justArrived, onSeen, vm.id])

  const cat = vm.intent_category_key
  // Bucket to the tenant's surfaced category (unsurfaced -> "others"); drives
  // the stamp color (data-c), display name, and swatch from the data-driven
  // tenant config (Option A bucketing + T-243 data-driven swatches).
  const effCat = effectiveCategory(cat, categories)
  const dataC = effCat?.key ?? 'pending'
  const stampDisplay = effCat?.display ?? vm.intent_category_display_at_capture ?? 'Pending'
  const stampStyle = effCat ? ({ '--stamp-c': effCat.swatch } as CSSProperties) : undefined
  const repeat = vm.repeat_caller_count > 0

  // --- Processing state: patient typewriter, Layout C chrome --------------
  if (processing) {
    return (
      <article className={styles.cardC} data-c="pending" data-processing="true">
        <div className={styles.thC}>
          <span
            data-c="pending"
            className={cn(styles.stampSimple, styles.stampStatic)}
          >
            <span aria-hidden="true" className={styles.stampSwatch} />
            <span className={styles.stampWord}>Transcribing</span>
          </span>
        </div>
        <div className="px-2.5 pb-2.5 pt-2">
          {/* The transcribing line stands in for the eventual summary - it
              takes the same hero slot, content-first. */}
          <p className="mb-2 text-[16px] italic leading-[1.35] text-rcp-brown">
            <em>{typed}</em>
            <span
              aria-hidden="true"
              className={cn(
                'ml-0.5 inline-block translate-y-px not-italic text-rcp-terra-warm',
                styles.caret,
              )}
            >
              |
            </span>
          </p>
          <div className="mb-[3px] flex items-baseline justify-between gap-3">
            <span className="font-rcp-mono text-[12.5px] font-semibold tabular-nums text-rcp-text-body">
              {formatPhone(vm.caller_phone)}
            </span>
            <span className="font-rcp-mono text-[10.5px] tabular-nums text-rcp-brown">
              {formatDuration(vm.audio_duration_seconds)}
            </span>
          </div>
          <div className="mb-2 font-rcp-mono text-[10px] lowercase tracking-[0.02em] text-rcp-brown">
            <span>new caller</span>
          </div>
          <div className={styles.audioWrap}>
            <AudioPlayer
              audioUrl={vm.audio_url}
              durationSeconds={vm.audio_duration_seconds}
            />
          </div>
        </div>
        <FootCaption vm={vm} index={index} now={now} />
      </article>
    )
  }

  // --- Normal state ------------------------------------------------------
  // T-418 high-value phasing (item 8). `now` is 0 until mounted (SSR-safe).
  // age drives: arrival pulse (~6s) -> phase-1 breathing glow (~60s) ->
  // phase-2 static ring + running-light border. Non-hv new cards use the
  // parent's justArrived flag for the arrival ring instead.
  const isHighValue =
    punchOn && vm.status === 'new' && HV_CATEGORIES.has(vm.intent_category_key ?? '')
  const age = now > 0 ? now - vm.captured_at : 0
  const hvPhase2 = isHighValue && age >= 60000
  const treatmentClass = punchOn
    ? isHighValue
      ? age < 6000
        ? punch.arrive
        : age < 60000
          ? punch.hvPhase1
          : punch.hvPhase2
      : justArrived
        ? punch.arrive
        : ''
    : ''
  const blocked = punchOn && vm.status === 'spam'

  // T-418 punch action row: Call back / Resolve / Ignore / | / Spam / Expand
  // (item 1a/4). 40px targets, tooltips via data-tip, stopPropagation so an
  // action never toggles the card. Non-new cards show only the chevron; the
  // reopen/restore/unblock control lives in the bottom state row.
  const punchHeaderActions = (
    <>
      {vm.status === 'new' ? (
        <>
          <button
            type="button"
            className={cn(punch.hib, punch.hibCall)}
            data-tip="Call back"
            aria-label="Call back"
            disabled={readOnly}
            onClick={(e) => {
              e.stopPropagation()
              clearArrival()
              if (onCall) onCall(vm.id)
              else armCall(e)
            }}
          >
            <IconCall w={16} h={16} />
          </button>
          <button
            type="button"
            className={cn(punch.hib, punch.hibResolve)}
            data-tip="Resolve"
            aria-label="Resolve"
            disabled={readOnly}
            onClick={(e) => {
              e.stopPropagation()
              clearArrival()
              onStatusChange(vm.id, 'resolved')
            }}
          >
            <IconCheck w={17} h={17} />
          </button>
          <button
            type="button"
            className={cn(punch.hib, punch.hibIgnore)}
            data-tip="Ignore"
            aria-label="Ignore"
            disabled={readOnly}
            onClick={(e) => {
              e.stopPropagation()
              clearArrival()
              onStatusChange(vm.id, 'ignore')
            }}
          >
            <IconEyeOff w={16} h={16} />
          </button>
          <span className={punch.hibDivider} aria-hidden="true" />
          <button
            type="button"
            className={cn(punch.hib, punch.hibSpam)}
            data-tip="Spam"
            aria-label="Spam"
            disabled={readOnly}
            onClick={(e) => {
              e.stopPropagation()
              clearArrival()
              onSpamRequest?.(vm)
            }}
          >
            <IconBlock w={15} h={15} />
          </button>
        </>
      ) : null}
      <button
        type="button"
        className={cn(punch.hib, punch.hibChev)}
        data-tip={expanded ? 'Collapse' : 'Expand'}
        aria-label={expanded ? 'Collapse' : 'Expand'}
        onClick={(e) => {
          e.stopPropagation()
          clearArrival()
          setExpanded((v) => !v)
        }}
      >
        <IconChevron w={17} h={17} sw={2.2} />
      </button>
    </>
  )

  const headerActions =
    vm.status === 'new' ? (
      <>
        <HeaderIconBtn
          kind="check"
          label="Mark resolved"
          title={readOnly ? 'Read-only preview' : undefined}
          disabled={readOnly}
          onClick={(e) => {
            e.stopPropagation()
            onStatusChange(vm.id, 'resolved')
          }}
        />
        <HeaderIconBtn
          kind="chev"
          label={expanded ? 'Collapse' : 'Expand'}
          expanded={expanded}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
        />
        <HeaderIconBtn
          kind="phone"
          // With onCall (coexistence kiosk) the parent owns the confirm-bridge
          // modal, so the card does a single hand-off tap; without it
          // (standalone) the two-tap tel: arm stand-in stays.
          label={onCall ? 'Call back' : callArmed ? 'Tap again to call' : 'Call back'}
          title={readOnly ? 'Read-only preview' : undefined}
          armed={onCall ? false : callArmed}
          disabled={readOnly}
          onClick={
            onCall
              ? (e) => {
                  e.stopPropagation()
                  onCall(vm.id)
                }
              : armCall
          }
        />
      </>
    ) : (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onStatusChange(vm.id, 'new')
        }}
        disabled={readOnly}
        title={readOnly ? 'Read-only preview' : vm.status === 'resolved' ? 'Reopen' : 'Restore'}
        aria-label={vm.status === 'resolved' ? 'Reopen' : 'Restore'}
        className={cn(
          styles.tap48,
          styles.hib,
          styles.hibRestore,
          readOnly && 'cursor-not-allowed opacity-40',
        )}
      >
        <IconReturn w={15} h={15} sw={2} />
      </button>
    )

  return (
    <article
      data-c={dataC}
      data-call-armed={callArmed ? 'true' : undefined}
      data-reclassify-open={reclassifyOpen ? 'true' : undefined}
      onClick={(e) => {
        clearArrival()
        handleCardClick(e)
      }}
      className={cn(
        styles.cardC,
        isHighValue && punch.hv,
        treatmentClass,
        blocked && punch.blocked,
      )}
    >
      {punchOn && justArrived ? (
        <span className={punch.newflag} aria-hidden="true">
          Just now
        </span>
      ) : null}
      {hvPhase2 ? (
        <svg className={punch.runlightSvg} aria-hidden="true" preserveAspectRatio="none">
          <rect className={punch.runlightRect} pathLength={100} />
        </svg>
      ) : null}
      {/* Header band - tinted per category. Chrome: tapping the band's bare
          area toggles expand; the stamp + action buttons do not. */}
      <div className={styles.thC} data-card-chrome>
        <button
          ref={stampRef}
          type="button"
          data-c={dataC}
          style={stampStyle}
          disabled={readOnly}
          onClick={(e) => {
            e.stopPropagation()
            if (cat) setReclassifyOpen((o) => !o)
          }}
          title={readOnly ? 'Read-only preview' : 'Tap to reclassify intent'}
          aria-label="Reclassify intent"
          aria-expanded={reclassifyOpen}
          className={cn(
            styles.stampSimple,
            isHighValue && punch.hvChip,
            readOnly && 'cursor-not-allowed',
          )}
        >
          <span aria-hidden="true" className={styles.stampSwatch} />
          <span className={styles.stampWord}>{stampDisplay}</span>
        </button>

        <div className={styles.thCActions}>
          {punchOn ? punchHeaderActions : headerActions}
        </div>

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

      {/* Arm-bar - only while CALL is armed. */}
      {callArmed ? <CallArmBar phone={formatPhone(vm.caller_phone)} /> : null}

      {/* Body - content-first: summary, then phone byline, then meta, audio.
          Chrome: tapping the body's padding / inter-row gaps toggles expand;
          tapping the content rows themselves does not. */}
      <div className="px-2.5 pb-2.5 pt-2" data-card-chrome>
        <p className="mb-2 text-[17px] font-semibold leading-[1.3] tracking-[-0.01em] text-rcp-text-strong [text-wrap:pretty]">
          {vm.summary}
        </p>

        {punchOn ? (
          <div className={cn('mb-[3px]', punch.phoneRow)}>
            <span
              className={cn(
                'font-rcp-mono text-[12.5px] font-semibold tabular-nums text-rcp-text-body',
                blocked && punch.blockedPhone,
              )}
            >
              {formatPhone(vm.caller_phone)}
            </span>
            <span className={punch.when}>
              &middot; {now > 0 ? formatWhen(vm.captured_at, now) : ''}
            </span>
            <span
              className={cn(
                'font-rcp-mono text-[10.5px] tabular-nums text-rcp-brown',
                punch.dur,
              )}
            >
              {formatDuration(vm.audio_duration_seconds)}
            </span>
          </div>
        ) : (
          <div className="mb-[3px] flex items-baseline justify-between gap-3">
            <span className="font-rcp-mono text-[12.5px] font-semibold tabular-nums text-rcp-text-body">
              {formatPhone(vm.caller_phone)}
            </span>
            <span className="font-rcp-mono text-[10.5px] tabular-nums text-rcp-brown">
              {formatDuration(vm.audio_duration_seconds)}
            </span>
          </div>
        )}

        <div className="mb-2 inline-flex flex-wrap items-center gap-1.5 font-rcp-mono text-[10px] lowercase tracking-[0.02em] text-rcp-brown">
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
              <span className="text-rcp-text-body">
                prefers: {vm.callback_preference}
              </span>
            </>
          ) : null}
        </div>

        {/* Audio sits on every card so staff can hit play instantly. Not
            chrome - the e.target gate keeps player clicks from toggling. */}
        <div className={styles.audioWrap}>
          <AudioPlayer
            audioUrl={vm.audio_url}
            durationSeconds={vm.audio_duration_seconds}
          />
        </div>
      </div>

      {/* Expanded - full transcript + extracted details (same as v1). Not
          chrome: tapping the transcript / details / HIDE never folds the
          card out from under the reader. */}
      {expanded ? (
        <div className="px-3 pb-2.5">
          <div className="mb-2.5 mt-1 flex items-center gap-2.5 font-rcp-mono text-[10px] uppercase tracking-[0.15em] text-rcp-brown before:h-0 before:flex-1 before:border-t before:border-dashed before:border-rcp-rule before:content-[''] after:h-0 after:flex-1 after:border-t after:border-dashed after:border-rcp-rule after:content-['']">
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

          {/* Off path only: the punch surface moves Ignore to the header
              action row (item 1a), so this in-transcript HIDE button is not
              shown when punch is on. */}
          {!punchOn && vm.status === 'new' ? (
            <button
              type="button"
              onClick={onHideClick}
              disabled={readOnly}
              title={readOnly ? 'Read-only preview' : undefined}
              className={cn(
                'mt-3 inline-flex min-h-[48px] items-center gap-2 rounded-md border px-3.5 font-rcp-mono text-[11px] font-bold uppercase tracking-[0.08em]',
                hideArmed
                  ? 'border-solid border-rcp-danger bg-rcp-danger text-white'
                  : 'border-dashed border-rcp-danger-soft text-rcp-danger',
                readOnly && 'cursor-not-allowed opacity-40',
              )}
            >
              {hideArmed ? 'TAP TO CONFIRM HIDE' : 'HIDE'}
            </button>
          ) : null}
        </div>
      ) : null}

      <FootCaption vm={vm} index={index} now={now} />

      {/* State stamp. Punch surface: a state row with reopen/restore/unblock
          (items 1d/2/5), blue Resolved (item 5). Off path: the existing
          resolved/hidden stamps, byte-identical. */}
      {punchOn ? (
        <>
          {vm.status === 'resolved' ? (
            <div className={punch.stateRow} onClick={(e) => e.stopPropagation()}>
              <span className={cn(punch.state, punch.stateResolved)}>
                <IconCheck w={12} h={12} />
                <span>
                  Resolved
                  {vm.resolved_at && now > 0
                    ? ` · ${formatRelative(vm.resolved_at, now)}`
                    : ''}
                  {vm.resolved_by ? ` · ${vm.resolved_by}` : ''}
                </span>
              </span>
              {!readOnly ? (
                <button
                  type="button"
                  className={punch.actGhost}
                  onClick={() => onStatusChange(vm.id, 'new')}
                >
                  <IconReturn w={14} h={14} />
                  <span>Reopen</span>
                </button>
              ) : null}
            </div>
          ) : null}
          {vm.status === 'ignore' || vm.status === 'hidden' ? (
            <div className={punch.stateRow} onClick={(e) => e.stopPropagation()}>
              <span className={cn(punch.state, punch.stateIgnore)}>
                <IconEyeOff w={12} h={12} />
                <span>
                  Ignored
                  {(vm.ignore_reason ?? vm.hidden_reason)
                    ? ` · ${vm.ignore_reason ?? vm.hidden_reason}`
                    : ''}
                </span>
              </span>
              {!readOnly ? (
                <button
                  type="button"
                  className={punch.actGhost}
                  onClick={() => onStatusChange(vm.id, 'new')}
                >
                  <IconReturn w={14} h={14} />
                  <span>Restore</span>
                </button>
              ) : null}
            </div>
          ) : null}
          {vm.status === 'spam' ? (
            <div className={punch.stateRow} onClick={(e) => e.stopPropagation()}>
              <span className={cn(punch.state, punch.stateSpam, punch.blockedBadge)}>
                <IconBlock w={12} h={12} />
                <span>
                  Spam · number blocked{vm.spam_by ? ` · ${vm.spam_by}` : ''}
                </span>
              </span>
              {!readOnly ? (
                <button
                  type="button"
                  className={punch.actGhost}
                  onClick={() => onUnblockRequest?.(vm)}
                >
                  <IconReturn w={14} h={14} />
                  <span>Unblock</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {vm.status === 'resolved' ? (
            <div className={styles.footC}>
              <span className="inline-flex items-center gap-1.5 rounded border border-rcp-success-soft px-2.5 py-1.5 font-rcp-mono text-[11px] font-bold uppercase tracking-[0.12em] text-rcp-success">
                <IconCheck w={12} h={12} />
                <span>
                  RESOLVED
                  {vm.resolved_at && now > 0
                    ? ` · ${formatRelative(vm.resolved_at, now)}`
                    : ''}
                  {vm.resolved_by ? ` · ${vm.resolved_by}` : ''}
                </span>
              </span>
            </div>
          ) : null}
          {vm.status === 'hidden' ? (
            <div className={styles.footC}>
              <span className="inline-flex items-center gap-1.5 rounded border border-dashed border-rcp-rule px-2.5 py-1.5 font-rcp-mono text-[11px] font-bold uppercase tracking-[0.12em] text-rcp-brown">
                <IconEyeOff w={12} h={12} />
                <span>HIDDEN{vm.hidden_reason ? ` · ${vm.hidden_reason}` : ''}</span>
              </span>
            </div>
          ) : null}
        </>
      )}
    </article>
  )
}
