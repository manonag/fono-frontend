'use client'

// Phase C.3 Sprint 1 labeler editor controls. Replaces the owner SaveControls
// status dropdown entirely: a labeler can only submit to in_review or release
// the claim. Swap all speakers is a client-side flip of the form working layer
// (safe while dirty); it gates on claim ownership only. No status dropdown, no
// demote actions.

interface LabelerSaveControlsProps {
  submitting: boolean
  releasing: boolean
  saveError: string | null
  hasNext: boolean
  onSubmit: () => void
  onRelease: () => void
  onSwapAllSpeakers?: () => void
  swapping?: boolean
  // Whether the current user holds the claim on this recording. Owned-claim
  // actions (swap all speakers) are enabled only when true. Gates on the
  // claim, not the retired GET-time lock.
  ownsClaim?: boolean
}

export function LabelerSaveControls({
  submitting,
  releasing,
  saveError,
  hasNext,
  onSubmit,
  onRelease,
  onSwapAllSpeakers,
  swapping = false,
  ownsClaim = false,
}: LabelerSaveControlsProps) {
  const busy = submitting || releasing || swapping
  return (
    <div className="px-4 py-3 border-t border-ink/10 bg-white sticky bottom-0">
      <div className="flex items-center gap-3 flex-wrap">
        {onSwapAllSpeakers && (
          <button
            type="button"
            onClick={onSwapAllSpeakers}
            // Labeler swap-all is a client-side flip of the form working layer
            // (same layer as split/toggle edits), so it is safe on a dirty
            // form; dirty no longer blocks it. Only claim ownership and an
            // in-flight action gate it. (Owner swap keeps its server path and
            // dirty guard in SaveControls.)
            disabled={busy || !ownsClaim}
            className="text-xs text-brown hover:text-ink underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              !ownsClaim
                ? 'Pick this recording up to your queue before swapping speakers'
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
