'use client'

interface SummaryCardProps {
  title: string
  value: string | number
  subtitle?: string
  accent?: 'default' | 'green' | 'red' | 'amber'
  delay?: number
}

const accentStyles = {
  default: 'text-ink',
  green: 'text-green-600',
  red: 'text-terra',
  amber: 'text-amber-600',
}

export default function SummaryCard({ title, value, subtitle, accent = 'default', delay = 0 }: SummaryCardProps) {
  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-warm-border p-4 sm:p-6 min-w-[140px] animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-sm font-medium text-brown-light">{title}</p>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${accentStyles[accent]}`}>{value}</p>
      {subtitle && <p className="text-xs text-brown-light mt-1">{subtitle}</p>}
    </div>
  )
}
