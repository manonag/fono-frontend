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
// claim, not be mid-action, and have no unsaved edits (a server swap refetches
// and would drop them).
export function canLabelerSwap(opts: {
  claimedByUserId: string | null | undefined
  currentUserId: string | null | undefined
  dirty: boolean
  busy: boolean
}): boolean {
  return (
    ownsClaim(opts.claimedByUserId, opts.currentUserId) &&
    !opts.dirty &&
    !opts.busy
  )
}
