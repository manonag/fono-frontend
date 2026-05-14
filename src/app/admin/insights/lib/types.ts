// Types for the /admin/insights dashboard (sprint 1610b462).
// Mirror the backend response shapes from
// app/services/admin_tara_insights.py exactly (snake_case fields).

export type PrimaryIntent =
  | 'information_seeking'
  | 'comparison_shopping'
  | 'ready_to_buy'
  | 'support_question'
  | 'exploratory'
  | 'competitor_research'
  | 'press_partnership_recruiting'
  | 'unknown'

export type EmotionalTone =
  | 'positive'
  | 'neutral'
  | 'frustrated'
  | 'confused'
  | 'excited'

export type HotLeadConfidence = 'high' | 'medium' | 'low' | 'none'

export type InsightType =
  | 'question_asked'
  | 'objection_raised'
  | 'feature_requested'
  | 'competitor_mentioned'
  | 'pricing_reaction'
  | 'confusion_point'
  | 'excitement_signal'

export interface SessionAnalysis {
  id: string
  // session_id and conversation_id are the same UUID; the backend
  // returns both so callers can use whichever name reads clearer.
  session_id: string
  conversation_id: string
  audience: string
  channel: string
  tenant_id: string | null
  conversation_summary: string | null
  turn_count: number | null
  primary_intent: PrimaryIntent | null
  emotional_tone: EmotionalTone | null
  hot_lead_confidence: HotLeadConfidence | null
  // Lifted out of the hot_lead_signals_json JSONB blob by the backend.
  hot_lead_reasoning: string | null
  // Raw extraction signals; not displayed in the v1 dashboard, so the
  // element shape is left unasserted rather than guessed.
  hot_lead_signals: unknown[]
  captured_email: string | null
  captured_phone: string | null
  exclusion_flags: string[]
  extraction_model: string
  extraction_tokens: number | null
  processed_at: string | null
  created_at: string | null
}

export interface SessionsResponse {
  sessions: SessionAnalysis[]
  total: number
  limit: number
  offset: number
}

export interface TranscriptTurn {
  created_at: string | null
  user_message: string | null
  assistant_message: string | null
  error: string | null
}

export interface ConversationInsight {
  id: string
  insight_type: InsightType
  summary: string
  verbatim_quote: string | null
}

export interface ConversationDetail {
  conversation_id: string
  session: SessionAnalysis | null
  transcript: TranscriptTurn[]
  insights_by_type: Record<string, ConversationInsight[]>
  insight_count: number
}
