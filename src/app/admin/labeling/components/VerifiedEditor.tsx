'use client'

import { useEffect, useRef } from 'react'

interface VerifiedEditorProps {
  value: string
  onChange: (value: string) => void
  onFocusChange?: (focused: boolean) => void
}

export function VerifiedEditor({ value, onChange, onFocusChange }: VerifiedEditorProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <div className="px-4 py-3">
      <label className="block">
        <span className="block text-sm font-semibold text-ink mb-1">
          Verified Transcript
        </span>
        <span className="block text-xs text-brown mb-2">
          Edit until it matches what was actually said. Pre-filled with machine output —
          make corrections inline. Native scripts welcome.
        </span>
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          rows={4}
          className="w-full bg-white border border-ink/20 rounded px-3 py-2 text-sm text-ink leading-relaxed focus:outline-none focus:border-terra resize-none"
          spellCheck={false}
        />
      </label>
    </div>
  )
}
