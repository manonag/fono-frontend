'use client'

import type { CSSProperties, ReactNode } from 'react'

// Shared primitive atoms for the v3.3 Settings surface (Onboarding +
// Settings redesign). Ported from CD's `voicemail-settings/primitives.jsx`
// per the engineering hand-off §5.7 (VS_TOKENS -> tokens).
//
// These are intentionally SEPARATE from the global `@/components/button`:
// the v3.3 settings surface is its own visual system (radius 12, five
// button variants, inline-hex tokens) and follows the self-contained
// inline-style convention already established by path-card / locked-preview
// / setup-banner. Do not retrofit the global Button onto these.

// ─── Design tokens ──────────────────────────────────────────────────────
export const tokens = {
  terra: '#E0602A',
  terraDark: '#C84E20',
  terraDeep: '#D4652C',
  cream: '#FDF0E8',
  ink: '#1E0E00',
  body: '#5C3D22',
  muted: '#8B7355',
  hint: '#B0A090',
  rule: 'rgba(0,0,0,0.06)',
  ruleSoft: 'rgba(0,0,0,0.04)',
  inputBorder: 'rgba(0,0,0,0.08)',
  cardBg: '#FFFFFF',
  fieldBg: '#F5F0EB',
  danger: '#EF4444',
  dangerBg: 'rgba(239,68,68,0.06)',
  amber: '#F59E0B',
  amberFg: '#92400E',
  amberBg: 'rgba(245,158,11,0.08)',
  amberEdge: 'rgba(245,158,11,0.20)',
  success: '#22C55E',
  successFg: '#0F7B3E',
  successBg: 'rgba(34,197,94,0.10)',
} as const

export const MONO = "'JetBrains Mono', ui-monospace, monospace"

// ─── SettingsCard ───────────────────────────────────────────────────────
type SettingsCardProps = {
  title?: string
  badge?: ReactNode
  action?: ReactNode
  children: ReactNode
  danger?: boolean
  padding?: string
  style?: CSSProperties
}

export function SettingsCard({
  title,
  badge,
  action,
  children,
  danger = false,
  padding = '24px 28px',
  style,
}: SettingsCardProps) {
  return (
    <div
      style={{
        backgroundColor: tokens.cardBg,
        borderRadius: 20,
        border: danger
          ? '1px solid rgba(239,68,68,0.2)'
          : `1px solid ${tokens.ruleSoft}`,
        padding,
        ...style,
      }}
    >
      {(title || badge || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: title ? 18 : 0,
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            {title && (
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: danger ? tokens.danger : tokens.ink,
                  margin: 0,
                }}
              >
                {title}
              </h3>
            )}
            {badge && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: tokens.muted,
                  padding: '3px 9px',
                  borderRadius: 6,
                  background: tokens.fieldBg,
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

// ─── Button (settings surface) ──────────────────────────────────────────
type SettingsButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'outline'
type SettingsButtonSize = 'sm' | 'md' | 'lg'

type SettingsButtonProps = {
  children: ReactNode
  variant?: SettingsButtonVariant
  size?: SettingsButtonSize
  icon?: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  style?: CSSProperties
  'aria-label'?: string
}

const BTN_SIZES: Record<SettingsButtonSize, CSSProperties> = {
  sm: { padding: '7px 14px', fontSize: 13 },
  md: { padding: '10px 22px', fontSize: 14 },
  lg: { padding: '13px 28px', fontSize: 15 },
}

const BTN_VARIANTS: Record<SettingsButtonVariant, CSSProperties> = {
  primary: { background: tokens.terra, color: '#fff' },
  secondary: { background: tokens.fieldBg, color: tokens.ink },
  ghost: { background: 'transparent', color: tokens.terra },
  danger: { background: tokens.danger, color: '#fff' },
  outline: {
    background: '#fff',
    color: tokens.ink,
    border: `1.5px solid ${tokens.inputBorder}`,
  },
}

export function SettingsButton({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  onClick,
  disabled = false,
  type = 'button',
  style,
  ...rest
}: SettingsButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={rest['aria-label']}
      style={{
        border: 'none',
        borderRadius: 12,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'inherit',
        lineHeight: 1.2,
        ...BTN_SIZES[size],
        ...BTN_VARIANTS[variant],
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  )
}

// ─── Banner ─────────────────────────────────────────────────────────────
type BannerTone = 'info' | 'amber' | 'danger' | 'success' | 'neutral'

type BannerProps = {
  tone?: BannerTone
  icon?: ReactNode
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
  style?: CSSProperties
}

const BANNER_PALETTE: Record<
  BannerTone,
  { bg: string; edge: string; fg: string }
> = {
  info: { bg: 'rgba(74,109,134,0.08)', edge: 'rgba(74,109,134,0.18)', fg: '#26425A' },
  amber: { bg: tokens.amberBg, edge: tokens.amberEdge, fg: tokens.amberFg },
  danger: { bg: tokens.dangerBg, edge: 'rgba(239,68,68,0.22)', fg: '#7F1D1D' },
  success: { bg: tokens.successBg, edge: 'rgba(34,197,94,0.25)', fg: tokens.successFg },
  neutral: { bg: tokens.fieldBg, edge: tokens.rule, fg: tokens.body },
}

export function Banner({
  tone = 'info',
  icon,
  title,
  children,
  action,
  style,
}: BannerProps) {
  const palette = BANNER_PALETTE[tone]
  return (
    <div
      role="status"
      style={{
        padding: '14px 18px',
        borderRadius: 14,
        background: palette.bg,
        border: `1px solid ${palette.edge}`,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        ...style,
      }}
    >
      {icon && (
        <div style={{ color: palette.fg, flex: '0 0 auto', marginTop: 1 }}>
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: palette.fg,
              marginBottom: children ? 4 : 0,
            }}
          >
            {title}
          </div>
        )}
        {children && (
          <div style={{ fontSize: 13, color: palette.fg, lineHeight: 1.55 }}>
            {children}
          </div>
        )}
      </div>
      {action && <div style={{ flex: '0 0 auto' }}>{action}</div>}
    </div>
  )
}

// ─── ToggleSwitch ───────────────────────────────────────────────────────
type ToggleSwitchProps = {
  on: boolean
  onChange?: (next: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  'aria-label'?: string
}

export function ToggleSwitch({
  on,
  onChange,
  disabled = false,
  size = 'md',
  ...rest
}: ToggleSwitchProps) {
  const w = size === 'sm' ? 36 : 44
  const h = size === 'sm' ? 22 : 26
  const dot = h - 6
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={rest['aria-label']}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      style={{
        width: w,
        height: h,
        borderRadius: 999,
        border: 'none',
        background: on ? tokens.terra : '#D6CABE',
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        flex: '0 0 auto',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 3,
          left: on ? w - dot - 3 : 3,
          width: dot,
          height: dot,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
        }}
      />
    </button>
  )
}

// ─── TextField ──────────────────────────────────────────────────────────
type TextFieldProps = {
  value: string
  onChange?: (next: string) => void
  placeholder?: string
  locked?: boolean
  error?: boolean
  monospace?: boolean
  type?: string
  style?: CSSProperties
  'aria-label'?: string
}

export function TextField({
  value,
  onChange,
  placeholder,
  locked = false,
  error = false,
  monospace = false,
  type = 'text',
  style,
  ...rest
}: TextFieldProps) {
  return (
    <input
      type={type}
      value={value}
      readOnly={locked}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      aria-label={rest['aria-label']}
      style={{
        width: '100%',
        padding: '11px 14px',
        borderRadius: 12,
        border: `1.5px solid ${
          error
            ? tokens.danger
            : locked
              ? tokens.ruleSoft
              : tokens.inputBorder
        }`,
        fontSize: 14,
        fontWeight: 500,
        color: locked ? tokens.hint : tokens.ink,
        background: locked ? '#FAF7F3' : '#fff',
        fontFamily: monospace ? MONO : 'inherit',
        outline: 'none',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  )
}

// ─── FieldLabel / HelperText ────────────────────────────────────────────
export function FieldLabel({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <label
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: tokens.muted,
        display: 'block',
        marginBottom: 6,
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {children}
    </label>
  )
}

export function HelperText({
  children,
  tone = 'muted',
  style,
}: {
  children: ReactNode
  tone?: 'muted' | 'danger' | 'hint'
  style?: CSSProperties
}) {
  const color =
    tone === 'danger' ? tokens.danger : tone === 'hint' ? tokens.hint : tokens.muted
  return (
    <p style={{ fontSize: 12, color, margin: '6px 0 0', lineHeight: 1.5, ...style }}>
      {children}
    </p>
  )
}

// ─── Icons ──────────────────────────────────────────────────────────────
type IconProps = { size?: number }

export function CheckIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export function WarnIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

export function InfoIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  )
}

export function PhoneIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

// Small inline Google "G" mark used by the "synced from Google" pill.
export function GoogleMark({ size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.227c0-.708-.063-1.39-.183-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.51h3.227c1.887-1.74 2.986-4.302 2.986-7.351z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.227-2.51c-.895.6-2.04.955-3.391.955-2.605 0-4.81-1.76-5.595-4.124H3.072v2.59A9.996 9.996 0 0 0 12 22z" />
      <path fill="#FBBC05" d="M6.405 13.9A6.005 6.005 0 0 1 6.09 12c0-.659.114-1.3.314-1.9V7.51H3.073A9.996 9.996 0 0 0 2 12c0 1.614.386 3.14 1.073 4.49l3.332-2.59z" />
      <path fill="#EA4335" d="M12 5.977c1.47 0 2.787.505 3.823 1.498l2.865-2.865C16.96 2.99 14.696 2 12 2A9.996 9.996 0 0 0 3.073 7.51l3.332 2.59C7.19 7.738 9.395 5.977 12 5.977z" />
    </svg>
  )
}
