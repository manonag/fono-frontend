import { cn } from '@/lib/utils'

interface BadgeProps {
  status: 'answered' | 'missed' | 'recovered' | 'ignored' | 'completed' | 'no-answer'
}

const statusConfig: Record<BadgeProps['status'], { label: string; classes: string }> = {
  answered: { label: 'Answered', classes: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-700' },
  missed: { label: 'Missed', classes: 'bg-red-100 text-red-700' },
  recovered: { label: 'Recovered', classes: 'bg-blue-100 text-blue-700' },
  ignored: { label: 'Ignored', classes: 'bg-gray-100 text-gray-500' },
  'no-answer': { label: 'No Answer', classes: 'bg-red-100 text-red-700' },
}

export function Badge({ status }: BadgeProps) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.classes
      )}
    >
      {config.label}
    </span>
  )
}
