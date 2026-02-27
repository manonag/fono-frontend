interface BadgeProps {
  status: string
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  answered:    { label: 'Answered',    bg: '#DCFCE7', text: '#16A34A' },
  completed:   { label: 'Completed',   bg: '#DCFCE7', text: '#16A34A' },
  missed:      { label: 'Missed',      bg: '#FEE2E2', text: '#DC2626' },
  recovered:   { label: 'Recovered',   bg: '#DBEAFE', text: '#2563EB' },
  ignored:     { label: 'Ignored',     bg: '#F3F4F6', text: '#6B7280' },
  'no-answer': { label: 'No Answer',   bg: '#FEE2E2', text: '#DC2626' },
  in_progress: { label: 'In Progress', bg: '#FEF3C7', text: '#D97706' },
}

const fallback = { label: 'Unknown', bg: '#F3F4F6', text: '#6B7280' }

export function Badge({ status }: BadgeProps) {
  const config = statusConfig[status] || fallback
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        backgroundColor: config.bg,
        color: config.text,
        lineHeight: '18px',
      }}
    >
      {config.label}
    </span>
  )
}
