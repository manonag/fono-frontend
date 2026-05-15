export interface CallRecord {
  id: string
  caller_number: string
  // Backend's _ux_status (app/services/tenant_views.py) produces exactly
  // these literals — see sprint c630d5f1 A6 for why the legacy hyphenated
  // 'no-answer' was dropped.
  status: 'completed' | 'missed' | 'recovered' | 'ignored' | 'in_progress'
  consent_given: boolean
  duration_seconds: number | null
  recording_url: string | null
  created_at: string
}

export interface DashboardSummary {
  total_calls: number
  missed_calls: number
  answered_calls: number
  total_duration_seconds: number
  total_recordings: number
  period: string
}

export interface AnalyticsSummary {
  tenant_id: string
  tenant_name: string
  period_days: number
  total_calls: number
  missed_calls: number
  answered_calls: number
  status_breakdown: Record<string, number>
}

export interface PeakHourEntry {
  hour_utc: number
  call_count: number
}

export interface PeakHoursResponse {
  tenant_id: string
  timezone: string
  peak_hours: PeakHourEntry[]
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
  caller?: string
  dateFrom?: string
  dateTo?: string
}

export type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'custom'

export interface CallEvent {
  type: string
  call: CallRecord
  timestamp: string
}
