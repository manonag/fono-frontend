'use client'

interface FilterPillsProps {
  active: string
  onChange: (filter: string) => void
}

const filters = [
  { key: 'all', label: 'All' },
  { key: 'missed', label: 'Missed' },
  { key: 'answered', label: 'Answered' },
]

export default function FilterPills({ active, onChange }: FilterPillsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
            active === f.key
              ? 'bg-terra text-white'
              : 'bg-white text-brown border border-warm-border hover:bg-cream-secondary'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
