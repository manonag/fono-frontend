'use client'

// T-418 punch-list overlays for the CoexistKiosk sla-off surface: the spam /
// unblock confirm dialog, the 6s undo toast, and the status legend popover.
// Ported from the CD punch.jsx reference; copy is verbatim. Rendered only when
// the punch surface is active (tenant.spam_blocklist_enabled).

import type { Voicemail } from '../types'
import { formatPhone } from '../helpers'
import { IconBlock, IconClose, IconReturn } from '../icons'
import punch from '../punch.module.css'

export type PunchConfirm = { kind: 'spam' | 'unblock'; vm: Voicemail } | null
export type PunchToast = { key: number; phone: string; vmId: string; prevStatus: string } | null

// ─── Confirm dialog (items 1b, 1d) ──────────────────────────────────────────
// alertdialog; confirm is a plain type="button" in a div (never the Enter
// default). Scrim or Cancel dismisses.
export function ConfirmSheet({
  confirm,
  tenantName,
  onConfirm,
  onCancel,
}: {
  confirm: PunchConfirm
  tenantName: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!confirm) return null
  const phone = formatPhone(confirm.vm.caller_phone)
  const isSpam = confirm.kind === 'spam'
  return (
    <div
      className={punch.overlay}
      id={isSpam ? 'spam-confirm-dialog' : 'unblock-confirm-dialog'}
      data-el="confirm-overlay"
      onClick={onCancel}
    >
      <div
        className={punch.dialog}
        role="alertdialog"
        aria-modal="true"
        data-kind={confirm.kind}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className={`${punch.dialogGlyph} ${isSpam ? punch.dialogGlyphSpam : punch.dialogGlyphUnblock}`}
          aria-hidden="true"
        >
          {isSpam ? <IconBlock w={22} h={22} sw={2.2} /> : <IconReturn w={22} h={22} />}
        </span>
        <h3 className={punch.dialogTitle}>
          {isSpam ? `Mark as spam and block ${phone}?` : `Unblock ${phone}?`}
        </h3>
        <p className={punch.dialogBody}>
          {isSpam
            ? `They won't reach you again. Every future call from this number is blocked for ${tenantName}.`
            : 'Calls from this number will come through again, and this voicemail moves back to New.'}
        </p>
        <div className={punch.dialogActions}>
          <button
            type="button"
            className={`${punch.dbtn} ${punch.dbtnCancel}`}
            data-action="confirm-cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`${punch.dbtn} ${isSpam ? punch.dbtnDanger : punch.dbtnPrimary}`}
            data-action={isSpam ? 'confirm-spam' : 'confirm-unblock'}
            onClick={onConfirm}
          >
            {isSpam ? 'Mark spam and block' : 'Unblock number'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Undo toast (item 1c) — 6s with a draining progress rule ────────────────
export function UndoToast({ toast, onUndo }: { toast: PunchToast; onUndo: () => void }) {
  if (!toast) return null
  return (
    <div className={punch.toast} id="spam-undo-toast" data-el="undo-toast" key={toast.key}>
      <IconBlock w={14} h={14} />
      <span className={punch.toastMsg}>
        Marked as spam. {formatPhone(toast.phone)} is blocked.
      </span>
      <button type="button" className={punch.toastUndo} data-action="undo-spam" onClick={onUndo}>
        Undo
      </button>
      <span className={punch.toastTimer} aria-hidden="true" />
    </div>
  )
}

// ─── Status legend (item 7) ─────────────────────────────────────────────────
const LEGEND_ROWS = [
  { s: 'new', word: 'New', def: 'Not handled yet.', dot: punch.legendDotNew },
  { s: 'resolved', word: 'Resolved', def: 'Called back.', dot: punch.legendDotResolved },
  { s: 'ignore', word: 'Ignore', def: 'Not actionable.', dot: punch.legendDotIgnore },
  { s: 'spam', word: 'Spam', def: 'Junk. Caller blocked.', dot: punch.legendDotSpam },
]

export function Legend({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <span className={punch.legendWrap}>
      <button
        type="button"
        className={`${punch.legendBtn} ${open ? punch.legendBtnOpen : ''}`}
        id="status-legend-btn"
        data-el="legend-toggle"
        aria-label="What the statuses mean"
        onClick={() => setOpen(!open)}
      >
        i
      </button>
      {open ? (
        <div className={punch.legend} id="status-legend" data-el="legend-popover">
          <div className={punch.legendHead}>
            <span>What the statuses mean</span>
            <button
              type="button"
              className={punch.legendClose}
              data-action="legend-dismiss"
              aria-label="Dismiss"
              onClick={() => setOpen(false)}
            >
              <IconClose w={12} h={12} />
            </button>
          </div>
          {LEGEND_ROWS.map((r) => (
            <div className={punch.legendRow} key={r.s}>
              <span className={`${punch.legendDot} ${r.dot}`} aria-hidden="true" />
              <span className={punch.legendWord}>{r.word}</span>
              <span className={punch.legendDef}>{r.def}</span>
            </div>
          ))}
        </div>
      ) : null}
    </span>
  )
}
