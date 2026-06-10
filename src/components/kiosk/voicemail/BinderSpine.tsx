'use client'

// Binder spine for the Layout C voicemail kiosk (v2.3) - the 56px left edge
// that replaces the v1 rail entirely. Three stacked sections:
//   top  - the fono wordmark
//   mid  - VerticalBinderStrip: the five category tabs (All + four
//          IntentKeys), with tap-to-flip and press-and-drag-to-scrub
//   foot - tenant initials, LIVE dot + last-sync seconds, clock, theme toggle
//
// VerticalBinderStrip lives here (not its own file) per the implementation
// brief's component list. Tenant identity arrives as a prop - the spine
// never reads the session directly (CHIRAN principle #49). The clock ticks
// locally via useClock (0 until mounted, so SSR and first client render
// match); `syncAt` is owned by KioskPage and passed down.

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { formatClock } from './helpers'
import { useClock } from './hooks'
import { IconMoon, IconSun } from './icons'
import styles from './styles.module.css'
import { useBinderStrip, type BinderOption } from './useBinderStrip'
import type { CategoryFilter, Tenant } from './types'

interface BinderSpineProps {
  tenant: Tenant
  dark: boolean
  onToggleTheme: () => void
  categoryOptions: BinderOption<CategoryFilter>[]
  category: CategoryFilter
  setCategory: (c: CategoryFilter) => void
  // Owned by KioskPage. null until the first data load completes.
  syncAt: number | null
}

// The fono wordmark, sized for the spine: "f" + pulsing brand dot + "no".
// Same construction as the v1 header wordmark, scaled to 16px.
function SpineLogo() {
  return (
    <div className="inline-flex items-baseline font-nunito text-[16px] font-extrabold leading-none tracking-[-0.02em] text-rcp-ink">
      <span>f</span>
      <span
        aria-hidden="true"
        className={cn(
          'mx-px inline-block h-1.5 w-1.5 rounded-full bg-rcp-terra-warm',
          styles.brandDot,
        )}
      />
      <span>no</span>
    </div>
  )
}

// The middle section of the spine: category tabs with the drag-scrub gesture.
// Exported so the coexistence variant (NestedVoicemailSurface) can mount the
// same category spine inside the Live/SLA kiosk without the logo/foot chrome
// (CHIRAN arch fact #362). The standalone Layout C still composes it via
// BinderSpine below — unchanged.
export function VerticalBinderStrip({
  value,
  onChange,
  options,
}: {
  value: CategoryFilter
  onChange: (c: CategoryFilter) => void
  options: BinderOption<CategoryFilter>[]
}) {
  const stripRef = useRef<HTMLDivElement>(null)
  const { dragging, dragPos, onPointerDown } = useBinderStrip(
    stripRef,
    options,
    value,
    onChange,
  )

  return (
    <div
      ref={stripRef}
      className={cn(styles.binderStrip, styles.binderStripV)}
      data-dragging={dragging ? 'true' : undefined}
      onPointerDown={onPointerDown('y')}
      role="group"
      aria-label="Filter by category"
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-c={opt.value}
          data-active={value === opt.value ? 'true' : undefined}
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={styles.bvtab}
        >
          <span className={styles.bvtabLabel}>{opt.label}</span>
          {opt.count != null ? (
            <span className={styles.bvtabCount}>
              {String(opt.count).padStart(2, '0')}
            </span>
          ) : null}
        </button>
      ))}
      {dragging && dragPos != null ? (
        <div
          aria-hidden="true"
          className={cn(styles.binderCursor, styles.binderCursorV)}
          style={{ top: `${dragPos}px` }}
        />
      ) : null}
    </div>
  )
}

export function BinderSpine({
  tenant,
  dark,
  onToggleTheme,
  categoryOptions,
  category,
  setCategory,
  syncAt,
}: BinderSpineProps) {
  const now = useClock()

  const initials = tenant.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const sinceSync =
    syncAt !== null && now > 0 ? Math.max(0, Math.floor((now - syncAt) / 1000)) : null

  return (
    <aside className={styles.spine}>
      <div className={styles.spineTop}>
        <SpineLogo />
      </div>

      <VerticalBinderStrip
        value={category}
        onChange={setCategory}
        options={categoryOptions}
      />

      <div className={styles.spineFoot}>
        <span
          className={styles.spineTenant}
          title={`${tenant.name} - ${tenant.location}`}
        >
          {initials}
        </span>
        <span
          className={styles.spineLive}
          title={sinceSync === null ? 'Live' : `Last sync ${sinceSync}s ago`}
        >
          <span aria-hidden="true" className={styles.spineLiveDot} />
          <span className={styles.spineLiveNum}>
            {sinceSync === null ? '--' : `${String(sinceSync).padStart(2, '0')}s`}
          </span>
        </span>
        <span className={styles.spineClock}>{now > 0 ? formatClock(now) : ''}</span>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={cn(styles.tap48, styles.spineTheme)}
        >
          {dark ? <IconSun w={14} h={14} /> : <IconMoon w={14} h={14} />}
        </button>
      </div>
    </aside>
  )
}
