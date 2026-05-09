'use client'

import {
  AUDIO_QUALITY_LABELS,
  AUDIO_QUALITY_TAGS,
  CALL_TYPES,
  CALL_TYPE_LABELS,
  ERROR_TAGS,
  ERROR_TAG_LABELS,
  LANGUAGE_PROFILES,
  LANGUAGE_PROFILE_LABELS,
} from '../lib/enums'
import type {
  AudioQualityTag,
  CallType,
  ErrorTag,
  LanguageProfile,
} from '../lib/enums'

export interface TagPanelValue {
  language_profile_tag: LanguageProfile | null
  call_type_tag: CallType | null
  audio_quality_tag: AudioQualityTag | null
  error_tags: ErrorTag[]
  contains_menu_items: boolean
  contains_prices: boolean
  contains_phone_numbers: boolean
  contains_names: boolean
  is_holdout: boolean
  reviewer_notes: string
}

interface TagPanelProps {
  value: TagPanelValue
  onChange: (next: TagPanelValue) => void
  onTextFocusChange?: (focused: boolean) => void
}

function RadioGroup<T extends string>({
  name,
  options,
  labels,
  value,
  onChange,
}: {
  name: string
  options: readonly T[]
  labels: Record<T, string>
  value: T | null
  onChange: (v: T | null) => void
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-1 mb-1">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex items-center gap-2 text-sm text-ink cursor-pointer"
          >
            <input
              type="radio"
              name={name}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="accent-terra"
            />
            <span>{labels[opt]}</span>
          </label>
        ))}
      </div>
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-terra hover:text-terra-dark"
        >
          Clear selection
        </button>
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-brown mb-2">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function TagPanel({ value, onChange, onTextFocusChange }: TagPanelProps) {
  const update = (patch: Partial<TagPanelValue>) => onChange({ ...value, ...patch })

  const toggleErrorTag = (tag: ErrorTag) => {
    const present = value.error_tags.includes(tag)
    const next = present
      ? value.error_tags.filter((t) => t !== tag)
      : [...value.error_tags, tag]
    update({ error_tags: next })
  }

  return (
    <div className="px-4 py-3 space-y-5">
      <Section title="Language Profile">
        <RadioGroup
          name="language_profile_tag"
          options={LANGUAGE_PROFILES}
          labels={LANGUAGE_PROFILE_LABELS}
          value={value.language_profile_tag}
          onChange={(v) => update({ language_profile_tag: v })}
        />
      </Section>

      <Section title="Call Type">
        <RadioGroup
          name="call_type_tag"
          options={CALL_TYPES}
          labels={CALL_TYPE_LABELS}
          value={value.call_type_tag}
          onChange={(v) => update({ call_type_tag: v })}
        />
      </Section>

      <Section title="Audio Quality">
        <RadioGroup
          name="audio_quality_tag"
          options={AUDIO_QUALITY_TAGS}
          labels={AUDIO_QUALITY_LABELS}
          value={value.audio_quality_tag}
          onChange={(v) => update({ audio_quality_tag: v })}
        />
      </Section>

      <Section title="Error Tags">
        <div className="grid grid-cols-2 gap-1">
          {ERROR_TAGS.map((tag) => (
            <label
              key={tag}
              className="flex items-center gap-2 text-sm text-ink cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value.error_tags.includes(tag)}
                onChange={() => toggleErrorTag(tag)}
                className="accent-terra"
              />
              <span>{ERROR_TAG_LABELS[tag]}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Contains">
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Toggle
            label="Menu items"
            checked={value.contains_menu_items}
            onChange={(b) => update({ contains_menu_items: b })}
          />
          <Toggle
            label="Prices"
            checked={value.contains_prices}
            onChange={(b) => update({ contains_prices: b })}
          />
          <Toggle
            label="Phone numbers"
            checked={value.contains_phone_numbers}
            onChange={(b) => update({ contains_phone_numbers: b })}
          />
          <Toggle
            label="Names"
            checked={value.contains_names}
            onChange={(b) => update({ contains_names: b })}
          />
        </div>
      </Section>

      <Section title="Holdout">
        <Toggle
          label="Mark as holdout (gold set candidate)"
          checked={value.is_holdout}
          onChange={(b) => update({ is_holdout: b })}
        />
      </Section>

      <Section title="Reviewer Notes">
        <textarea
          value={value.reviewer_notes}
          onChange={(e) => update({ reviewer_notes: e.target.value })}
          onFocus={() => onTextFocusChange?.(true)}
          onBlur={() => onTextFocusChange?.(false)}
          rows={3}
          placeholder="Optional. Free-form technical notes."
          className="w-full bg-white border border-ink/20 rounded px-3 py-2 text-sm font-mono text-ink leading-relaxed focus:outline-none focus:border-terra resize-y"
        />
      </Section>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={
          checked
            ? 'relative w-9 h-5 rounded-full bg-terra transition-colors'
            : 'relative w-9 h-5 rounded-full bg-ink/20 transition-colors'
        }
      >
        <span
          className={
            checked
              ? 'absolute top-0.5 left-[18px] w-4 h-4 rounded-full bg-white transition-all'
              : 'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all'
          }
        />
      </button>
      <span>{label}</span>
    </label>
  )
}
