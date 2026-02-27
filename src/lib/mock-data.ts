export interface Plan {
  slug: string
  name: string
  description: string
  price_monthly: number
  founding_price_monthly: number
  call_limit: number | null
  is_popular: boolean
  features: string[]
  upcoming_features: string[]
}

export interface Subscription {
  plan: string
  status: 'active' | 'inactive' | 'cancelled'
  amount: number
  is_founding_rate: boolean
  billing_interval: 'monthly' | 'yearly'
  current_period_end: string
}

export interface Usage {
  calls_this_period: number
  call_limit: number
  percentage_used: number
  storage_used_mb: number
  storage_limit_mb: number
}

export interface Invoice {
  id: string
  date: string
  plan_name: string
  amount: number
  status: 'paid' | 'pending' | 'failed'
}

export const MOCK_PLANS: Plan[] = [
  {
    slug: 'starter',
    name: 'Starter',
    description: 'For small restaurants',
    price_monthly: 29,
    founding_price_monthly: 19,
    call_limit: 100,
    is_popular: false,
    features: ['call_recording', 'whatsapp_alerts', 'analytics', 'call_log', 'email_reports', 'local_number'],
    upcoming_features: ['ai_voice_ordering', 'pos_integration', 'multi_language', 'menu_understanding', 'order_history'],
  },
  {
    slug: 'growth',
    name: 'Growth',
    description: 'For busy restaurants',
    price_monthly: 49,
    founding_price_monthly: 39,
    call_limit: 300,
    is_popular: true,
    features: ['call_recording', 'whatsapp_alerts', 'analytics', 'call_log', 'email_reports', 'local_number'],
    upcoming_features: ['ai_voice_ordering', 'pos_integration', 'multi_language', 'menu_understanding', 'order_history'],
  },
  {
    slug: 'pro',
    name: 'Pro',
    description: 'For high-volume restaurants',
    price_monthly: 99,
    founding_price_monthly: 79,
    call_limit: null,
    is_popular: false,
    features: ['call_recording', 'whatsapp_alerts', 'analytics', 'call_log', 'email_reports', 'local_number'],
    upcoming_features: ['ai_voice_ordering', 'pos_integration', 'multi_language', 'menu_understanding', 'order_history'],
  },
]

export const FEATURE_NAMES: Record<string, string> = {
  call_recording: 'Call recording & playback',
  whatsapp_alerts: 'Missed call WhatsApp alerts',
  analytics: 'Dashboard & analytics',
  call_log: 'Call log with search',
  email_reports: 'Daily & weekly email reports',
  local_number: 'Dedicated local phone number',
  ai_voice_ordering: 'AI voice ordering',
  pos_integration: 'Automatic order to POS',
  multi_language: 'Multi-language support',
  menu_understanding: 'Menu understanding & upsell',
  order_history: 'Customer order history',
}

export const MOCK_SUBSCRIPTION: Subscription = {
  plan: 'growth',
  status: 'active',
  amount: 39.00,
  is_founding_rate: true,
  billing_interval: 'monthly',
  current_period_end: '2026-04-01T00:00:00Z',
}

export const MOCK_USAGE: Usage = {
  calls_this_period: 127,
  call_limit: 300,
  percentage_used: 42.3,
  storage_used_mb: 324,
  storage_limit_mb: 5120,
}

export const MOCK_INVOICES: Invoice[] = [
  { id: 'inv_001', date: '2026-03-01', plan_name: 'Growth Plan', amount: 39.00, status: 'paid' },
  { id: 'inv_002', date: '2026-02-01', plan_name: 'Growth Plan', amount: 39.00, status: 'paid' },
]
