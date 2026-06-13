import { afterEach, describe, expect, it, vi } from 'vitest'

import { appendUniqueQueueItems } from '@/app/admin/labeling/lib/queue-paging'
import { fetchQueue } from '@/app/admin/labeling/lib/api'
import type { QueueItem } from '@/app/admin/labeling/lib/types'

// C3S2 Part 2: load-more pagination + owner tenant scope.

function item(recording_id: string): QueueItem {
  return { recording_id } as unknown as QueueItem
}

describe('appendUniqueQueueItems', () => {
  it('appends a second page in order', () => {
    const page1 = [item('a'), item('b')]
    const page2 = [item('c'), item('d')]
    expect(appendUniqueQueueItems(page1, page2).map((i) => i.recording_id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  it('drops overlap so a shifted page never duplicates rows', () => {
    const page1 = [item('a'), item('b'), item('c')]
    // page shifted: 'c' reappears at the head of page 2
    const page2 = [item('c'), item('d'), item('e')]
    const merged = appendUniqueQueueItems(page1, page2)
    expect(merged.map((i) => i.recording_id)).toEqual(['a', 'b', 'c', 'd', 'e'])
    // no duplicate ids
    expect(new Set(merged.map((i) => i.recording_id)).size).toBe(merged.length)
  })

  it('does not mutate the existing array', () => {
    const page1 = [item('a')]
    appendUniqueQueueItems(page1, [item('b')])
    expect(page1.map((i) => i.recording_id)).toEqual(['a'])
  })
})

describe('fetchQueue paging + scoping', () => {
  afterEach(() => vi.restoreAllMocks())

  function stubFetch(): string[] {
    const urls: string[] = []
    global.fetch = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url))
      return { ok: true, json: async () => ({ items: [], total: 0 }) } as Response
    }) as unknown as typeof fetch
    return urls
  }

  it('labeler: sends view + offset + limit, no tenant_id, no status', async () => {
    const urls = stubFetch()
    await fetchQueue('tok', {
      filter: 'all',
      sort: 'duration_desc',
      limit: 50,
      offset: 50,
      view: 'mine',
    })
    expect(urls[0]).toContain('view=mine')
    expect(urls[0]).toContain('offset=50')
    expect(urls[0]).toContain('limit=50')
    expect(urls[0]).not.toContain('tenant_id=')
    expect(urls[0]).not.toContain('status=')
  })

  it('owner: sends status + tenant_id + offset, no view', async () => {
    const urls = stubFetch()
    await fetchQueue('tok', {
      filter: 'in_review',
      sort: 'duration_desc',
      limit: 50,
      offset: 100,
      tenantId: 'f5508b0c-98f9-4987-88eb-0b059c8dcbe4',
    })
    expect(urls[0]).toContain('status=in_review')
    expect(urls[0]).toContain('tenant_id=f5508b0c-98f9-4987-88eb-0b059c8dcbe4')
    expect(urls[0]).toContain('offset=100')
    expect(urls[0]).not.toContain('view=')
  })

  it('owner with no tenantId omits tenant_id (All tenants)', async () => {
    const urls = stubFetch()
    await fetchQueue('tok', {
      filter: 'all',
      sort: 'duration_desc',
      limit: 50,
      offset: 0,
      tenantId: null,
    })
    expect(urls[0]).not.toContain('tenant_id=')
  })
})
