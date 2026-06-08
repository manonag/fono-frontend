'use client'

import { useState } from 'react'
import { tokens, SettingsCard, HelperText } from '@/components/settings-primitives'
import { chipTint } from '@/lib/palette'

// Settings -> Calls §4 "Categories" chip card (CD §6 / brief §6.4).
//
// Option A taxonomy (Chiran decision 2026-06-08): chip.key is constrained to
// one of the 6 classifier keys; chip.label is owner-customizable. Adding a
// category surfaces an as-yet-unsurfaced key (with its default label, then
// rename inline); the 6th unsurfaced key still classifies and folds into
// "others" on the kiosk (bucketing voicemail.intent_key == chip.key). Colors
// are data-driven via chipTint(swatch).

export type CategoryChipModel = {
  key: string
  label: string
  swatch: string
  required?: boolean
}

// The 6 classifier keys + their default labels (mirrors the backend
// app/services/categories.py ChipKey / DEFAULT_LABELS).
const ALL_CHIP_KEYS: { key: string; label: string }[] = [
  { key: 'order', label: 'Order' },
  { key: 'reservation', label: 'Reservation' },
  { key: 'menu_question', label: 'Menu question' },
  { key: 'catering', label: 'Catering' },
  { key: 'banquet_hall', label: 'Banquet hall' },
  { key: 'others', label: 'Others' },
]

const DEFAULT_CATEGORIES: CategoryChipModel[] = [
  { key: 'order', label: 'Order', swatch: '#D4652C' },
  { key: 'catering', label: 'Catering', swatch: '#7B9C68' },
  { key: 'banquet_hall', label: 'Banquet hall', swatch: '#4A6D86' },
  { key: 'others', label: 'Others', swatch: '#B0A090', required: true },
]

const MAX_CATEGORIES = 5

type CategoriesChipCardProps = {
  categories?: CategoryChipModel[]
  onAdd?: (key: string) => void
  onRemove?: (key: string) => void
  onRename?: (key: string, label: string) => void
  busy?: boolean
}

export function CategoriesChipCard({
  categories = DEFAULT_CATEGORIES,
  onAdd,
  onRemove,
  onRename,
  busy = false,
}: CategoriesChipCardProps) {
  const [picking, setPicking] = useState(false)
  const atCap = categories.length >= MAX_CATEGORIES
  const surfaced = new Set(categories.map((c) => c.key))
  const available = ALL_CHIP_KEYS.filter((k) => !surfaced.has(k.key))
  const canAdd = !!onAdd && !atCap && available.length > 0

  return (
    <SettingsCard title="Categories" badge={`${categories.length} of ${MAX_CATEGORIES}`}>
      <p style={{ fontSize: 13, color: tokens.body, margin: '0 0 14px', lineHeight: 1.55 }}>
        Categories drive how Fono labels voicemails on the kiosk and in SMS
        receipts. Up to {MAX_CATEGORIES}. Click a chip to rename. Click &times;
        to remove. <strong>Others</strong> is required.
      </p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: '14px 14px',
          borderRadius: 12,
          background: tokens.fieldBg,
          border: `1.5px solid ${tokens.rule}`,
          opacity: busy ? 0.6 : 1,
          pointerEvents: busy ? 'none' : 'auto',
        }}
      >
        {categories.map((cat) => (
          <CategoryChip
            key={cat.key}
            category={cat}
            onRemove={onRemove}
            onRename={onRename}
          />
        ))}

        {canAdd && (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setPicking((v) => !v)}
              aria-expanded={picking}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 999,
                border: `1.5px dashed ${tokens.rule}`,
                background: '#fff',
                fontSize: 12.5,
                color: tokens.muted,
                cursor: 'pointer',
              }}
            >
              <span style={{ color: tokens.terra, fontWeight: 700 }}>+</span> Add category
            </button>

            {picking && (
              <div
                role="menu"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 10,
                  minWidth: 180,
                  background: '#fff',
                  border: `1px solid ${tokens.rule}`,
                  borderRadius: 12,
                  boxShadow: '0 8px 24px -8px rgba(0,0,0,0.18)',
                  padding: 6,
                }}
              >
                {available.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setPicking(false)
                      onAdd?.(k.key)
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: 'none',
                      background: 'none',
                      fontSize: 13,
                      color: tokens.ink,
                      cursor: 'pointer',
                    }}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {atCap && (
        <HelperText tone="muted" style={{ marginTop: 10 }}>
          <strong style={{ color: tokens.amberFg }}>
            You&rsquo;re at {MAX_CATEGORIES} categories.
          </strong>{' '}
          Remove one to add another.
        </HelperText>
      )}
    </SettingsCard>
  )
}

function CategoryChip({
  category,
  onRemove,
  onRename,
}: {
  category: CategoryChipModel
  onRemove?: (key: string) => void
  onRename?: (key: string, label: string) => void
}) {
  const tint = chipTint(category.swatch)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(category.label)

  const commit = () => {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== category.label) onRename?.(category.key, next)
    else setDraft(category.label)
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: category.required ? '6px 12px' : '6px 6px 6px 12px',
        borderRadius: 999,
        background: tint.bg,
        border: `1.5px solid ${tint.border}`,
        fontSize: 13,
        fontWeight: 600,
        color: tokens.ink,
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 10, height: 10, borderRadius: '50%', background: tint.dot, marginRight: 2 }}
      />

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              setDraft(category.label)
              setEditing(false)
            }
          }}
          aria-label={`Rename ${category.label}`}
          style={{
            border: 'none',
            borderBottom: `1.5px solid ${tint.dot}`,
            background: 'transparent',
            font: 'inherit',
            color: 'inherit',
            outline: 'none',
            width: Math.max(60, draft.length * 8),
            padding: '0 2px',
          }}
        />
      ) : onRename && !category.required ? (
        <button
          type="button"
          onClick={() => {
            setDraft(category.label)
            setEditing(true)
          }}
          style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer' }}
        >
          {category.label}
        </button>
      ) : (
        <span>{category.label}</span>
      )}

      {category.required ? (
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: tokens.muted,
            padding: '2px 6px',
            borderRadius: 4,
            background: '#fff',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Required
        </span>
      ) : (
        <button
          type="button"
          aria-label={`Remove ${category.label}`}
          onClick={() => onRemove?.(category.key)}
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.06)',
            border: 'none',
            color: tokens.body,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          &times;
        </button>
      )}
    </span>
  )
}
