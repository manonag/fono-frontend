'use client'

interface DemoToggleProps {
  value: boolean
  onChange: (next: boolean) => void
}

export const DEMO_TOGGLE_STORAGE_KEY = 'fono_admin_show_demo'

export function DemoToggle({ value, onChange }: DemoToggleProps) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-cream/80 hover:text-cream">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-cream/40 accent-terra"
      />
      Show demo tenants
    </label>
  )
}
