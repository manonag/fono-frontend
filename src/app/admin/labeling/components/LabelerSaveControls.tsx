'use client'

// Phase C.3 Sprint 1 labeler editor controls. Replaces the owner SaveControls
// status dropdown entirely: a labeler can only submit to in_review or release
// the claim. Swap all speakers is a mid-edit owned-claim operation and is
// disabled while the form has unsaved edits (a server swap would refetch and
// drop them). No status dropdown, no demote actions.

interface LabelerSaveControlsProps {
  dirty: boolean
  submitting: boolean
  releasing: boolean
  saveError: string | null
  hasNext: boolean
  onSubmit: () => void
  onRelease: () => void
  onSwapAllSpeakers?: () => void
  swapping?: boolean
}

export function LabelerSaveControls({
  dirty,
  submitting,
  releasing,
  saveError,
  hasNext,
  onSubmit,
  onRelease,
  onSwapAllSpeakers,
  swapping = false,
}: LabelerSaveControlsProps) {
  const busy = submitting || releasing || swapping
  return (
    <div className="px-4 py-3 border-t border-ink/10 bg-white sticky bottom-0">
      <div className="flex items-center gap-3 flex-wrap">
        {onSwapAllSpeakers && (
          <button
            type="button"
            onClick={onSwapAllSpeakers}
            disabled={busy || dirty}
            className="text-xs text-brown hover:text-ink underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              dirty
                ? 'Save or submit pending edits before swap-all'
                : 'Flips S1 and S2 across the ENTIRE recording. Use only when the whole recording is reversed.'
            }
          >
            {swapping ? 'Swapping...' : 'Swap all speakers'}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onRelease}
            disabled={busy}
            className="px-3 py-2 rounded font-medium text-sm bg-ink/5 text-ink hover:bg-ink/10 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Returns this recording to the Pending pool for anyone to pick up. Your edits stay on the recording."
          >
            {releasing ? 'Releasing…' : 'Release back to queue'}
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="px-4 py-2 rounded font-semibold text-sm bg-terra text-white hover:bg-terra-dark disabled:bg-terra/30 disabled:cursor-not-allowed"
            title={
              hasNext
                ? 'Submit for owner review and open the next recording (Cmd/Ctrl+Enter)'
                : 'Submit for owner review'
            }
          >
            {submitting ? 'Submitting…' : 'Submit for review'}
          </button>
        </div>
      </div>
      {saveError && (
        <p className="mt-2 text-xs text-red-700 font-medium">{saveError}</p>
      )}
    </div>
  )
}
