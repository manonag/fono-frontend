// Stroke icon set for the voicemail-route kiosk (Direction A - receipt).
// Ported from design_handoff_voicemail_kiosk/kiosk/icons.jsx - only the
// icons Direction A actually uses. Sized to currentColor, consistent 1.7
// stroke weight (filled icons override sw to 0).
//
// The repo has no shared icon component, so these live with the voicemail
// kiosk. If a shared icon set is introduced later, swap these out.

import type { CSSProperties, ReactNode } from 'react'

export interface IconProps {
  w?: number
  h?: number
  sw?: number
  fill?: string
  style?: CSSProperties
}

interface BaseIconProps extends IconProps {
  children: ReactNode
}

function Icon({ w = 18, h = 18, sw = 1.7, fill = 'none', style, children }: BaseIconProps) {
  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function IconPlay(p: IconProps) {
  return (
    <Icon {...p} fill="currentColor" sw={0}>
      <path d="M7 5v14l12-7L7 5z" />
    </Icon>
  )
}

export function IconPause(p: IconProps) {
  return (
    <Icon {...p} fill="currentColor" sw={0}>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </Icon>
  )
}

export function IconPhone(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.12.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.58 2.81.7A2 2 0 0122 16.92z" />
    </Icon>
  )
}

// Direction A labels the callback action "CALL BACK"; alias kept for clarity
// at call sites.
export const IconCall = IconPhone

export function IconCheck(p: IconProps) {
  return (
    <Icon {...p} sw={2.2}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  )
}

export function IconEyeOff(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <path d="M14.12 14.12A3 3 0 119.88 9.88" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </Icon>
  )
}

export function IconChevron(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="6 9 12 15 18 9" />
    </Icon>
  )
}

export function IconClose(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  )
}

export function IconClock(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </Icon>
  )
}

export function IconReturn(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="3 12 8 7 8 11 17 11 17 17 21 17" />
    </Icon>
  )
}

// T-418 Spam / block glyph (circle + diagonal slash). Ported from the CD
// punch bundle (IconBlock). Used by the Spam action, undo toast, and dialogs.
export function IconBlock(p: IconProps) {
  return (
    <Icon {...p} sw={p.sw ?? 2}>
      <circle cx="12" cy="12" r="9" />
      <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
    </Icon>
  )
}

export function IconSwap(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </Icon>
  )
}

// Sun / moon for the header theme toggle. The CD prototype's theme switch
// lived in the design-time shell; the production header carries its own
// toggle, matching the existing SLA kiosk pattern.
export function IconSun(p: IconProps) {
  return (
    <Icon {...p} sw={1.8}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </Icon>
  )
}

export function IconMoon(p: IconProps) {
  return (
    <Icon {...p} sw={1.8}>
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </Icon>
  )
}
