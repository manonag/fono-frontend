export interface CallRecord {
  id: string
  tenant_id: string
  caller_number: string
  status: 'completed' | 'missed' | 'recovered' | 'ignored' | 'no-answer'
  duration: number | null
  recording_url: string | null
  created_at: string
  updated_at: string
}

export interface DashboardSummary {
  total_calls: number
  missed_calls: number
  answered_calls: number
  recovered_calls: number
  avg_response_time: number
  total_duration_seconds: number
  total_recordings: number
  period: string
}

export interface ChartDataPoint {
  hour: number
  label: string
  answered: number
  missed: number
  recovered: number
}

export interface CallLogFilters {
  status: 'all' | 'completed' | 'missed' | 'recovered' | 'ignored'
  page: number
  perPage: number
}

export type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

export interface CallEvent {
  type: string
  call: CallRecord
  timestamp: string
}
