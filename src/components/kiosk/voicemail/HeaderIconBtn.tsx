'use client'

// Compact 32x32 icon button for the Layout C card action cluster (v2.3).
//
// Three variants: `check` (RESOLVE), `chev` (EXPAND/COLLAPSE), `phone` (CALL
// BACK with a confirm-in-place armed state). Icon-only - the label lives in
// the tooltip + aria-label so a brand-new staff member can hover/long-press
// to learn the verb. The visual button is 32x32; an invisible ::before
// (styles.tap48) expands the hit area to the 48x48 tablet tap-target floor.
//
// The `phone` variant turns solid red and pulses when `armed`. The `chev`
// variant rotates 180deg when `expanded` (per the v2.3 interaction table).
// REOPEN/RESTORE on resolved/hidden cards is NOT a variant here - it is
// rendered inline by VoicemailCard, sharing the .hib base class.

import { cn } from '@/lib/utils'
import { IconCheck, IconChevron, IconPhone } from './icons'
import styles from './styles.module.css'

interface HeaderIconBtnProps {
  kind: 'check' | 'chev' | 'phone'
  label: string // aria-label, and the default tooltip
  onClick: (e: React.MouseEvent) => void
  armed?: boolean // phone variant only - confirm-in-place armed state
  expanded?: boolean // chev variant only - rotates the chevron 180deg
  title?: string // tooltip override (falls back to `label`)
}

const KIND_CLASS: Record<HeaderIconBtnProps['kind'], string> = {
  check: styles.hibCheck,
  chev: styles.hibChev,
  phone: styles.hibPhone,
}

export function HeaderIconBtn({
  kind,
  label,
  onClick,
  armed,
  expanded,
  title,
}: HeaderIconBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
      // Attribute, not a class, so the CSS-module hashing leaves it alone.
      data-armed={kind === 'phone' && armed ? 'true' : undefined}
      className={cn(styles.tap48, styles.hib, KIND_CLASS[kind])}
    >
      {kind === 'check' ? <IconCheck w={15} h={15} sw={2.4} /> : null}
      {kind === 'chev' ? (
        <span
          className={cn(
            'inline-flex transition-transform duration-[180ms]',
            expanded && 'rotate-180',
          )}
        >
          <IconChevron w={15} h={15} sw={2.2} />
        </span>
      ) : null}
      {kind === 'phone' ? <IconPhone w={15} h={15} sw={2} /> : null}
    </button>
  )
}
