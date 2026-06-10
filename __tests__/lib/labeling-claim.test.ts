import { afterEach, describe, expect, it, vi } from 'vitest'

import { LabelingApiError, fetchQueue } from '@/app/admin/labeling/lib/api'
import { friendlyClaimError } from '@/app/admin/labeling/lib/errors'

// Phase C.3 Sprint 1 (Bite 3): the labeler experience routes claim/queue
// errors to friendly toasts on detail.code, and drives the queue with a
// server-side view param (never client-side tab hiding). These cover the two
// pure seams behind that UI.

describe('friendlyClaimError', () => {
  it('claim_conflict names the current holder', () => {
    const err = new LabelingApiError(409, 'Already claimed by Mourya', 'claim_conflict', {
      code: 'claim_conflict',
      claimed_by_name: 'Mourya',
    })
    const msg = friendlyClaimError(err)
    expect(msg).toContain('Mourya')
    expect(msg).toContain('already working')
  })

  it('claim_cap states the limit', () => {
    const err = new LabelingApiError(409, 'cap', 'claim_cap', {
      code: 'claim_cap',
      cap: 5,
      current: 5,
    })
    expect(friendlyClaimError(err)).toContain('5')
  })

  it('not_claimed gives recovery guidance, never a raw 403', () => {
    const err = new LabelingApiError(403, 'You do not hold the claim', 'not_claimed', {
      code: 'not_claimed',
    })
    const msg = friendlyClaimError(err)
    expect(msg).toMatch(/no longer hold/i)
    expect(msg).not.toMatch(/^403/)
  })

  it('forbidden_view is explained', () => {
    const err = new LabelingApiError(403, 'x', 'forbidden_view', { code: 'forbidden_view' })
    expect(friendlyClaimError(err)).toMatch(/not available/i)
  })

  it('falls back to the server message for an unknown code', () => {
    const err = new LabelingApiError(422, 'Bad input', null, null)
    expect(friendlyClaimError(err)).toBe('Bad input')
  })

  it('handles plain errors and non-errors', () => {
    expect(friendlyClaimError(new Error('boom'))).toBe('boom')
    expect(friendlyClaimError('weird', 'fallback copy')).toBe('fallback copy')
  })
})

describe('fetchQueue scoping', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function stubFetch(): string[] {
    const urls: string[] = []
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url))
      return {
        ok: true,
        json: async () => ({ items: [], total: 0, fetched_at: '' }),
      } as Response
    }) as unknown as typeof fetch
    return urls
  }

  it('sends view and omits status for a labeler scope', async () => {
    const urls = stubFetch()
    await fetchQueue('tok', { filter: 'all', sort: 'duration_desc', view: 'mine' })
    expect(urls[0]).toContain('view=mine')
    expect(urls[0]).not.toContain('status=')
  })

  it('sends status and omits view for an owner scope', async () => {
    const urls = stubFetch()
    await fetchQueue('tok', { filter: 'in_review', sort: 'duration_desc' })
    expect(urls[0]).toContain('status=in_review')
    expect(urls[0]).not.toContain('view=')
  })
})
