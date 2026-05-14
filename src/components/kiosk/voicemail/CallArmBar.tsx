'use client'

// Confirm-in-place arm bar for the Layout C card (v2.3).
//
// Renders below the card header band while CALL is armed (first tap on the
// phone icon). Reinforces what the second tap will do, in plain words, with
// the formatted number. Purely presentational: the arm/disarm state and the
// 3s auto-disarm timer live in VoicemailCard - this component just paints
// the strip and receives the already-formatted phone string as a prop.

import { IconPhone } from './icons'
import styles from './styles.module.css'

interface CallArmBarProps {
  phone: string // already formatted, e.g. "(408) 245-9901"
}

export function CallArmBar({ phone }: CallArmBarProps) {
  return (
    <div className={styles.callArm} role="status" aria-live="polite">
      <IconPhone w={12} h={12} />
      <span>Tap the phone icon again to call {phone}</span>
    </div>
  )
}
