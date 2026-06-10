'use client'

import { useEffect, useRef, useState } from 'react'

import {
  createCallFallbackRule,
  deleteCallFallbackRule,
  fetchCallFallbackRules,
  patchCallFallbackRule,
  type CallFallbackRuleInput,
} from '@/lib/api'
import type { CallFallbackRule } from '@/types'
import {
  FieldLabel,
  HelperText,
  PhoneIcon,
  SettingsButton,
  SettingsCard,
  TextField,
  WarnIcon,
  tokens,
} from '@/components/settings-primitives'

// T-249 Slice 3 — Settings -> Calls -> Call routing (State C). Unlocks the
// previously-locked card. Owners configure up to 3 windowed fallback numbers
// that Fono dials, in order, after the staff phone doesn't answer and before
// the universal voicemail tail. Mirrors the v3.3 settings inline-style
// convention + primitives (no Tailwind utilities here, matching the sibling
// cards), and the T-311 optimistic-update-with-rollback pattern.
//
// Per-hop ring time is fixed at 20s in V1 and intentionally not surfaced.
// Backend (Slice 1) owns the authoritative validation — E.164, same-day
// window with two case-specific messages, loop guard, duplicate-in-window,
// and the 3-active-per-window cap — and returns the reason as `detail`, which
// the api helpers throw and we render inline.

const MAX_RULES = 3

// Bit 0 = Mon .. bit 6 = Sun (matches the backend 7-bit mask).
const DAYS: { bit: number; short: string; long: string }[] = [
  { bit: 0, short: 'Mon', long: 'Monday' },
  { bit: 1, short: 'Tue', long: 'Tuesday' },
  { bit: 2, short: 'Wed', long: 'Wednesday' },
  { bit: 3, short: 'Thu', long: 'Thursday' },
  { bit: 4, short: 'Fri', long: 'Friday' },
  { bit: 5, short: 'Sat', long: 'Saturday' },
  { bit: 6, short: 'Sun', long: 'Sunday' },
]

const WEEKDAYS_MASK = 0b0011111 // Mon–Fri

function hasDay(mask: number, bit: number): boolean {
  return (mask & (1 << bit)) !== 0
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '')
}

function looksLikePhone(value: string): boolean {
  const d = digitsOf(value)
  return d.length === 10 || (d.length === 11 && d.startsWith('1'))
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}

type CallRoutingCardProps = {
  tenantId: string
  token?: string
  readOnly?: boolean
}

export function CallRoutingCard({ tenantId, token, readOnly = false }: CallRoutingCardProps) {
  const [rules, setRules] = useState<CallFallbackRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  // Debounce timers for the free-text fields (phone / label), keyed by
  // `${ruleId}:${field}`.
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!tenantId || !token) return
    let cancelled = false
    setLoading(true)
    fetchCallFallbackRules(tenantId, token)
      .then((rows) => {
        if (cancelled) return
        setRules([...rows].sort((a, b) => a.cascade_order - b.cascade_order))
      })
      .catch(() => {
        if (!cancelled) setError('Could not load fallback numbers. Please refresh.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tenantId, token])

  // Optimistic mutation with rollback: apply `next` immediately, run the API
  // op, and on failure restore the pre-mutation snapshot + surface the reason.
  const commit = async (next: CallFallbackRule[], op: () => Promise<unknown>) => {
    if (readOnly) return
    const snapshot = rules
    setRules(next)
    setError('')
    try {
      await op()
    } catch (err) {
      setRules(snapshot)
      setError(errorMessage(err))
    }
  }

  const setLocalField = (id: string, patch: Partial<CallFallbackRule>) => {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  // Free-text edits (phone / label): update locally on every keystroke, then
  // debounce the PATCH. On failure we surface the reason and re-sync from the
  // server so the row never lies about what was saved.
  const debouncedPatch = (id: string, field: string, body: Partial<CallFallbackRuleInput>) => {
    if (readOnly) return
    const key = `${id}:${field}`
    if (timers.current[key]) clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(async () => {
      setError('')
      try {
        const updated = await patchCallFallbackRule(id, body, token)
        setRules((rs) => rs.map((r) => (r.id === id ? updated : r)))
      } catch (err) {
        setError(errorMessage(err))
        try {
          const fresh = await fetchCallFallbackRules(tenantId, token)
          setRules([...fresh].sort((a, b) => a.cascade_order - b.cascade_order))
        } catch {
          /* leave the optimistic value; the error message stands */
        }
      }
    }, 700)
  }

  const handlePhoneChange = (rule: CallFallbackRule, value: string) => {
    setLocalField(rule.id, { phone_number: value })
    if (looksLikePhone(value)) debouncedPatch(rule.id, 'phone', { phone_number: value })
  }

  const handleLabelChange = (rule: CallFallbackRule, value: string) => {
    setLocalField(rule.id, { label: value })
    debouncedPatch(rule.id, 'label', { label: value })
  }

  const toggleDay = (rule: CallFallbackRule, bit: number) => {
    const nextMask = rule.days_of_week ^ (1 << bit)
    if (nextMask === 0) return // keep at least one day selected
    const next = rules.map((r) =>
      r.id === rule.id ? { ...r, days_of_week: nextMask } : r,
    )
    void commit(next, () => patchCallFallbackRule(rule.id, { days_of_week: nextMask }, token))
  }

  const changeWindow = (
    rule: CallFallbackRule,
    field: 'window_start' | 'window_end',
    value: string,
  ) => {
    if (!value) return
    const next = rules.map((r) => (r.id === rule.id ? { ...r, [field]: value } : r))
    void commit(next, () => patchCallFallbackRule(rule.id, { [field]: value }, token))
  }

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= rules.length) return
    const a = rules[index]
    const b = rules[target]
    const next = [...rules]
    next[index] = { ...b, cascade_order: a.cascade_order }
    next[target] = { ...a, cascade_order: b.cascade_order }
    next.sort((x, y) => x.cascade_order - y.cascade_order)
    void commit(next, async () => {
      await patchCallFallbackRule(a.id, { cascade_order: b.cascade_order }, token)
      await patchCallFallbackRule(b.id, { cascade_order: a.cascade_order }, token)
    })
  }

  const remove = (rule: CallFallbackRule) => {
    const next = rules.filter((r) => r.id !== rule.id)
    void commit(next, () => deleteCallFallbackRule(rule.id, token))
  }

  const handleAdd = async (input: CallFallbackRuleInput) => {
    setError('')
    try {
      const created = await createCallFallbackRule(tenantId, input, token)
      setRules((rs) => [...rs, created].sort((a, b) => a.cascade_order - b.cascade_order))
      setAdding(false)
    } catch (err) {
      setError(errorMessage(err))
      throw err // keep the add form open so the owner can fix + retry
    }
  }

  const atCap = rules.length >= MAX_RULES

  return (
    <SettingsCard
      title="Call routing"
      badge={`${rules.length}/${MAX_RULES}`}
      action={
        !readOnly && !adding && !atCap ? (
          <SettingsButton size="sm" variant="secondary" onClick={() => setAdding(true)}>
            Add fallback number
          </SettingsButton>
        ) : null
      }
    >
      {error ? (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            fontSize: 13,
            color: tokens.amberFg,
            background: tokens.amberBg,
            border: `1px solid ${tokens.amberEdge}`,
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 14,
          }}
        >
          <span style={{ flex: '0 0 auto', marginTop: 1 }}>
            <WarnIcon size={15} />
          </span>
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <p style={{ fontSize: 13, color: tokens.muted, margin: 0 }}>Loading…</p>
      ) : rules.length === 0 && !adding ? (
        <EmptyState readOnly={readOnly} onAdd={() => setAdding(true)} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {rules.map((rule, index) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              index={index}
              count={rules.length}
              readOnly={readOnly}
              onPhoneChange={(v) => handlePhoneChange(rule, v)}
              onLabelChange={(v) => handleLabelChange(rule, v)}
              onToggleDay={(bit) => toggleDay(rule, bit)}
              onWindowChange={(field, v) => changeWindow(rule, field, v)}
              onMoveUp={() => move(index, -1)}
              onMoveDown={() => move(index, 1)}
              onRemove={() => remove(rule)}
            />
          ))}
        </div>
      )}

      {adding ? (
        <AddRuleForm
          existingCount={rules.length}
          onCancel={() => {
            setAdding(false)
            setError('')
          }}
          onSubmit={handleAdd}
        />
      ) : null}

      {atCap && !adding ? (
        <HelperText style={{ marginTop: 14 }}>
          You&rsquo;ve added the maximum of {MAX_RULES} fallback numbers. Remove one to add another.
        </HelperText>
      ) : null}
    </SettingsCard>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ readOnly, onAdd }: { readOnly: boolean; onAdd: () => void }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '22px 16px',
        borderRadius: 14,
        background: tokens.fieldBg,
        border: `1px dashed ${tokens.inputBorder}`,
      }}
    >
      <div style={{ color: tokens.hint, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <PhoneIcon size={20} />
      </div>
      <p style={{ fontSize: 13.5, color: tokens.body, margin: '0 auto', maxWidth: 360, lineHeight: 1.5 }}>
        No fallback numbers yet. Calls go to voicemail when staff doesn&rsquo;t answer.
      </p>
      {!readOnly ? (
        <SettingsButton size="sm" variant="primary" style={{ marginTop: 14 }} onClick={onAdd}>
          Add fallback number
        </SettingsButton>
      ) : null}
    </div>
  )
}

// ── Day-of-week multi-select ─────────────────────────────────────────────────

function DayPicker({
  mask,
  disabled,
  onToggle,
}: {
  mask: number
  disabled: boolean
  onToggle: (bit: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {DAYS.map((d) => {
        const on = hasDay(mask, d.bit)
        return (
          <button
            key={d.bit}
            type="button"
            aria-pressed={on}
            aria-label={d.long}
            disabled={disabled}
            onClick={() => onToggle(d.bit)}
            style={{
              minWidth: 44,
              padding: '7px 10px',
              borderRadius: 10,
              border: `1.5px solid ${on ? tokens.terra : tokens.inputBorder}`,
              background: on ? tokens.terra : '#fff',
              color: on ? '#fff' : tokens.body,
              fontSize: 12.5,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
            }}
          >
            {d.short}
          </button>
        )
      })}
    </div>
  )
}

// ── Window (start / end) ─────────────────────────────────────────────────────

function WindowFields({
  start,
  end,
  disabled,
  onChange,
}: {
  start: string
  end: string
  disabled: boolean
  onChange: (field: 'window_start' | 'window_end', value: string) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 120px', minWidth: 120 }}>
        <FieldLabel>From</FieldLabel>
        <TextField
          type="time"
          value={start}
          locked={disabled}
          onChange={(v) => onChange('window_start', v)}
          aria-label="Window start time"
        />
      </div>
      <div style={{ flex: '1 1 120px', minWidth: 120 }}>
        <FieldLabel>To</FieldLabel>
        <TextField
          type="time"
          value={end}
          locked={disabled}
          onChange={(v) => onChange('window_end', v)}
          aria-label="Window end time"
        />
      </div>
    </div>
  )
}

// ── Rule row (editable) ──────────────────────────────────────────────────────

function RuleRow({
  rule,
  index,
  count,
  readOnly,
  onPhoneChange,
  onLabelChange,
  onToggleDay,
  onWindowChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  rule: CallFallbackRule
  index: number
  count: number
  readOnly: boolean
  onPhoneChange: (value: string) => void
  onLabelChange: (value: string) => void
  onToggleDay: (bit: number) => void
  onWindowChange: (field: 'window_start' | 'window_end', value: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${tokens.rule}`,
        background: '#fff',
        padding: '16px 18px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: tokens.muted,
          }}
        >
          Fallback {index + 1}
        </span>
        {!readOnly ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ReorderButton label="Move up" disabled={index === 0} onClick={onMoveUp} dir="up" />
            <ReorderButton
              label="Move down"
              disabled={index === count - 1}
              onClick={onMoveDown}
              dir="down"
            />
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove fallback ${index + 1}`}
              style={{
                marginLeft: 4,
                padding: '5px 10px',
                borderRadius: 9,
                border: 'none',
                background: tokens.dangerBg,
                color: tokens.danger,
                fontSize: 12.5,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 200px', minWidth: 180 }}>
          <FieldLabel>Phone number</FieldLabel>
          <TextField
            value={rule.phone_number}
            locked={readOnly}
            monospace
            onChange={onPhoneChange}
            aria-label={`Fallback ${index + 1} phone number`}
          />
          <HelperText>E.164, e.g. +12095551234. Fono dials this number.</HelperText>
        </div>
        <div style={{ flex: '1 1 160px', minWidth: 150 }}>
          <FieldLabel>Label (optional)</FieldLabel>
          <TextField
            value={rule.label ?? ''}
            locked={readOnly}
            placeholder="Manager cell"
            onChange={onLabelChange}
            aria-label={`Fallback ${index + 1} label`}
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Days</FieldLabel>
        <DayPicker mask={rule.days_of_week} disabled={readOnly} onToggle={onToggleDay} />
      </div>

      <WindowFields
        start={rule.window_start}
        end={rule.window_end}
        disabled={readOnly}
        onChange={onWindowChange}
      />
    </div>
  )
}

function ReorderButton({
  label,
  disabled,
  onClick,
  dir,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  dir: 'up' | 'down'
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 30,
        height: 28,
        borderRadius: 9,
        border: `1px solid ${tokens.inputBorder}`,
        background: '#fff',
        color: tokens.body,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {dir === 'up' ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
      </svg>
    </button>
  )
}

// ── Add-rule form ────────────────────────────────────────────────────────────

function AddRuleForm({
  existingCount,
  onCancel,
  onSubmit,
}: {
  existingCount: number
  onCancel: () => void
  onSubmit: (input: CallFallbackRuleInput) => Promise<void>
}) {
  const [phone, setPhone] = useState('')
  const [label, setLabel] = useState('')
  const [mask, setMask] = useState<number>(WEEKDAYS_MASK)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [localError, setLocalError] = useState('')
  const [busy, setBusy] = useState(false)

  const validate = (): string | null => {
    if (!looksLikePhone(phone)) return 'Enter a valid US phone number (10 digits).'
    if (mask === 0) return 'Pick at least one day of the week.'
    if (!start || !end) return 'Set a start and end time.'
    if (start === end) return "Start and end times can't be the same. Pick an end time later than the start."
    if (end < start) {
      return (
        "Overnight windows aren't supported yet. Split this into two same-day rules — " +
        'for example 22:00–23:59 and 00:00–02:00. Single overnight windows are coming in V2.'
      )
    }
    return null
  }

  const submit = async () => {
    const problem = validate()
    if (problem) {
      setLocalError(problem)
      return
    }
    setLocalError('')
    setBusy(true)
    try {
      await onSubmit({
        phone_number: phone.trim(),
        label: label.trim() || null,
        days_of_week: mask,
        window_start: start,
        window_end: end,
      })
    } catch {
      // The parent surfaces the server reason; keep the form open.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        marginTop: 14,
        borderRadius: 14,
        border: `1.5px solid ${tokens.terra}`,
        background: tokens.cream,
        padding: '16px 18px',
      }}
    >
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 800,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: tokens.terra,
          marginBottom: 14,
        }}
      >
        New fallback {existingCount + 1}
      </div>

      {localError ? (
        <p
          role="alert"
          style={{
            fontSize: 12.5,
            color: tokens.danger,
            margin: '0 0 12px',
            lineHeight: 1.5,
          }}
        >
          {localError}
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ flex: '1 1 200px', minWidth: 180 }}>
          <FieldLabel>Phone number</FieldLabel>
          <TextField
            value={phone}
            monospace
            placeholder="+12095551234"
            onChange={setPhone}
            aria-label="New fallback phone number"
          />
        </div>
        <div style={{ flex: '1 1 160px', minWidth: 150 }}>
          <FieldLabel>Label (optional)</FieldLabel>
          <TextField
            value={label}
            placeholder="Manager cell"
            onChange={setLabel}
            aria-label="New fallback label"
          />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <FieldLabel>Days</FieldLabel>
        <DayPicker mask={mask} disabled={false} onToggle={(bit) => setMask((m) => m ^ (1 << bit))} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <WindowFields
          start={start}
          end={end}
          disabled={false}
          onChange={(field, v) => (field === 'window_start' ? setStart(v) : setEnd(v))}
        />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <SettingsButton size="sm" variant="primary" disabled={busy} onClick={submit}>
          {busy ? 'Adding…' : 'Add'}
        </SettingsButton>
        <SettingsButton size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancel
        </SettingsButton>
      </div>
    </div>
  )
}
