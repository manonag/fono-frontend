import { LabelingApiError } from './api'

// Phase C.3 Sprint 1: turn a structured claim/queue error into friendly
// toast copy. Routes on err.detail?.code (claim_conflict, claim_cap,
// not_claimed, forbidden_view); never surfaces a raw 403 string. Falls back
// to the server message, then a generic line, for anything unrecognized.
export function friendlyClaimError(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof LabelingApiError) {
    const data = err.data
    switch (err.code) {
      case 'claim_conflict': {
        const who = data?.claimed_by_name ?? 'Another labeler'
        return `${who} is already working on this recording.`
      }
      case 'claim_cap': {
        const cap = data?.cap ?? 5
        return `You are at your limit of ${cap} open recordings. Submit or release one before picking up another.`
      }
      case 'not_claimed':
        return 'You no longer hold this recording. It may have been reassigned or released. Refresh your queue.'
      case 'forbidden_view':
        return 'That queue view is not available for your role.'
      default:
        return err.detail || fallback
    }
  }
  if (err instanceof Error) return err.message || fallback
  return fallback
}
