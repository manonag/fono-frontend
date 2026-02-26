interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    answered: 'bg-green-100 text-green-700',
    missed: 'bg-orange-100 text-terra',
    'in-progress': 'bg-amber-100 text-amber-700',
    ringing: 'bg-amber-100 text-amber-700',
  }

  const labels: Record<string, string> = {
    answered: 'Answered',
    missed: 'Missed',
    'in-progress': 'In Progress',
    ringing: 'Ringing',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status === 'in-progress' || status === 'ringing' ? (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse mr-1.5" />
      ) : null}
      {labels[status] || status}
    </span>
  )
}
