// Phase C.3 Sprint 1 escape hotfix. Owned-claim editor actions (Swap all
// speakers, per-segment ops) gate on claim ownership: the current user must
// hold the claim on the loaded recording. This replaces the retired GET-time
// lock check, which was always false once labelers open with
// acquire_lock=false. Pure so it is unit-testable in the node test env.

export function ownsClaim(
  claimedByUserId: string | null | undefined,
  currentUserId: string | null | undefined,
): boolean {
  return (
    !!claimedByUserId &&
    !!currentUserId &&
    claimedByUserId === currentUserId
  )
}

// Whether a labeler may run Swap all speakers right now: they must own the
// claim and not be mid-action. Labeler swap is a client-side flip of the form
// working layer (it does NOT refetch), so it is safe while the form is dirty;
// dirty no longer gates it.
export function canLabelerSwap(opts: {
  claimedByUserId: string | null | undefined
  currentUserId: string | null | undefined
  busy: boolean
}): boolean {
  return ownsClaim(opts.claimedByUserId, opts.currentUserId) && !opts.busy
}
