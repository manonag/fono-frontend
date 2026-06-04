'use client'

import { tokens, SettingsCard, HelperText } from '@/components/settings-primitives'
import { chipTint } from '@/lib/palette'

// Settings -> Calls §4 "Categories" chip card (CD §6 / brief §6.4).
//
// DISPLAY-ONLY in FE-1: it renders the chip set, the required "Others" pill,
// the "Type to add..." affordance, and the at-cap helper. The write paths
// (inline rename, add via slugify, remove, Palette A rotation) are wired in
// FE-3 once the categories CRUD backend lands. Colors are data-driven via
// chipTint(swatch) so they read straight from the backend category payload.

export type CategoryChipModel = {
  key: string
  name: string
  swatch: string
  required?: boolean
}

const DEFAULT_CATEGORIES: CategoryChipModel[] = [
  { key: 'order', name: 'Order', swatch: '#D4652C' },
  { key: 'catering', name: 'Catering', swatch: '#7B9C68' },
  { key: 'banquet_hall', name: 'Banquet hall', swatch: '#4A6D86' },
  { key: 'others', name: 'Others', swatch: '#B0A090', required: true },
]

const MAX_CATEGORIES = 5

type CategoriesChipCardProps = {
  categories?: CategoryChipModel[]
  onAdd?: () => void
  onRemove?: (key: string) => void
  onRename?: (key: string) => void
}

export function CategoriesChipCard({
  categories = DEFAULT_CATEGORIES,
  onAdd,
  onRemove,
  onRename,
}: CategoriesChipCardProps) {
  const atCap = categories.length >= MAX_CATEGORIES

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

        {!atCap && (
          <button
            type="button"
            onClick={onAdd}
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
              fontStyle: 'italic',
              cursor: 'text',
            }}
          >
            <span style={{ color: tokens.terra, fontWeight: 700 }}>+</span> Type to
            add&hellip;
          </button>
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
  onRename?: (key: string) => void
}) {
  const tint = chipTint(category.swatch)
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
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: tint.dot,
          marginRight: 2,
        }}
      />
      {onRename && !category.required ? (
        <button
          type="button"
          onClick={() => onRename(category.key)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            font: 'inherit',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          {category.name}
        </button>
      ) : (
        <span>{category.name}</span>
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
          aria-label={`Remove ${category.name}`}
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
