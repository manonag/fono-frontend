'use client'

import { STATUSES, STATUS_LABELS, canTransition } from '../lib/enums'
import type { Status } from '../lib/enums'

interface SaveControlsProps {
  status: Status
  initialStatus: Status
  dirty: boolean
  saving: boolean
  saveError: string | null
  onStatusChange: (status: Status) => void
  onSave: () => void
  onSaveAndNext: () => void
  hasNext: boolean
  // T-2d16e333: secondary recovery actions. Fires an independent PATCH;
  // does not depend on or alter form dirty state. Parent decides when
  // to surface (verified -> show send-back, gold -> show demote).
  onDemote?: (target: 'auto_labeled' | 'verified') => void
  demoting?: boolean
  // Sprint 1 bulk speaker swap. Server-side commit; disabled while form
  // is dirty so pending per-cell edits aren't silently dropped on refetch.
  // Hidden by the parent on statuses that the backend refuses (verified,
  // gold) so reviewers don't get a deceptive 422.
  onSwapAllSpeakers?: () => void
  swapping?: boolean
  swapDisabledReason?: string | null
}

export function SaveControls({
  status,
  initialStatus,
  dirty,
  saving,
  saveError,
  onStatusChange,
  onSave,
  onSaveAndNext,
  hasNext,
  onDemote,
  demoting = false,
  onSwapAllSpeakers,
  swapping = false,
  swapDisabledReason = null,
}: SaveControlsProps) {
  // suggestions_pending is reached via owner review_action='send_back', not
  // a direct status promotion, so it should not appear in the labeler save
  // dropdown even though auto_labeled -> suggestions_pending is forward by
  // rank. The labeler-side suggestions view (Commit 5) renders its own
  // Resubmit-for-review action separate from this dropdown.
  const allowed = STATUSES.filter(
    (s) => s !== 'suggestions_pending' && canTransition(initialStatus, s),
  )

  // T-2d16e333: secondary action visibility is keyed off the PERSISTED
  // status (initialStatus), not the dropdown selection. That way the
  // recovery button stays available even if the user has the dropdown
  // mid-change. The action operates on persisted state.
  const canSendBackToPending = initialStatus === 'verified'
  const canDemoteToVerified = initialStatus === 'gold'

  return (
    <div className="px-4 py-3 border-t border-ink/10 bg-white sticky bottom-0">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-ink">
          <span className="font-semibold mr-2">Status:</span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as Status)}
            className="bg-white border border-ink/20 rounded px-2 py-1 text-sm focus:outline-none focus:border-terra"
          >
            {allowed.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        {canSendBackToPending && onDemote && (
          <button
            type="button"
            onClick={() => onDemote('auto_labeled')}
            disabled={demoting || saving}
            className="text-xs text-brown hover:text-ink underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Reverts this row to Pending. Clears verified_at and verified_by. Lock released if held."
          >
            {demoting ? 'Sending back...' : 'Send back to Pending'}
          </button>
        )}
        {canDemoteToVerified && onDemote && (
          <button
            type="button"
            onClick={() => onDemote('verified')}
            disabled={demoting || saving}
            className="text-xs text-brown hover:text-ink underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Steps this row back from Gold to Verified. Original verification stays valid."
          >
            {demoting ? 'Demoting...' : 'Demote to Verified'}
          </button>
        )}
        {onSwapAllSpeakers && (
          <button
            type="button"
            onClick={onSwapAllSpeakers}
            disabled={swapping || saving || demoting || dirty}
            className="text-xs text-brown hover:text-ink underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              dirty
                ? 'Save pending edits before swap-all'
                : swapDisabledReason
                  ? swapDisabledReason
                  : 'Flips S1 and S2 across the ENTIRE recording. Use only when the whole recording is reversed.'
            }
          >
            {swapping ? 'Swapping...' : 'Swap all speakers'}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className="px-4 py-2 rounded font-semibold text-sm bg-ink text-cream hover:bg-ink/90 disabled:bg-ink/30 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onSaveAndNext}
            disabled={saving || !hasNext}
            className="px-4 py-2 rounded font-semibold text-sm bg-terra text-white hover:bg-terra-dark disabled:bg-terra/30 disabled:cursor-not-allowed"
            title={hasNext ? 'Cmd/Ctrl+Enter' : 'No next pending recording'}
          >
            {saving ? 'Saving…' : 'Save and Next →'}
          </button>
        </div>
      </div>
      {saveError && (
        <p className="mt-2 text-xs text-red-700 font-medium">{saveError}</p>
      )}
    </div>
  )
}
