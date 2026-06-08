import { describe, expect, it } from 'vitest'

import {
  bucketKey,
  effectiveCategory,
  filterAndSort,
} from '@/components/kiosk/voicemail/helpers'
import type { Category, IntentKey, Voicemail } from '@/components/kiosk/voicemail/types'

const tint = { light: '', dark: '', border: '' }
// Tenant surfaces only order + others (reservation/menu_question/catering/
// banquet_hall are unsurfaced and should fold into others).
const CATS: Category[] = [
  { key: 'order', display: 'Order', swatch: '#D4652C', tint },
  { key: 'others', display: 'Others', swatch: '#B0A090', tint },
]
const SURFACED = new Set(CATS.map((c) => c.key))

function vm(key: IntentKey | null, captured_at = 1): Voicemail {
  return {
    intent_category_key: key,
    status: 'new',
    captured_at,
  } as unknown as Voicemail
}

describe('bucketKey', () => {
  it('keeps a surfaced key', () => {
    expect(bucketKey('order', SURFACED)).toBe('order')
  })
  it('folds an unsurfaced key into others', () => {
    expect(bucketKey('reservation', SURFACED)).toBe('others')
    expect(bucketKey('menu_question', SURFACED)).toBe('others')
  })
  it('passes null through', () => {
    expect(bucketKey(null, SURFACED)).toBeNull()
  })
})

describe('effectiveCategory', () => {
  it('returns the surfaced category', () => {
    expect(effectiveCategory('order', CATS)?.key).toBe('order')
  })
  it('returns others for an unsurfaced key', () => {
    expect(effectiveCategory('catering', CATS)?.key).toBe('others')
    expect(effectiveCategory('catering', CATS)?.display).toBe('Others')
  })
  it('returns null while processing', () => {
    expect(effectiveCategory(null, CATS)).toBeNull()
  })
})

describe('filterAndSort bucketing', () => {
  const list = [vm('order', 3), vm('reservation', 2), vm('menu_question', 1)]

  it('others filter includes unsurfaced intents', () => {
    const out = filterAndSort(list, { status: 'new', category: 'others', sort: 'newest' }, CATS)
    expect(out.map((v) => v.intent_category_key)).toEqual(['reservation', 'menu_question'])
  })
  it('a surfaced filter excludes unsurfaced intents', () => {
    const out = filterAndSort(list, { status: 'new', category: 'order', sort: 'newest' }, CATS)
    expect(out.map((v) => v.intent_category_key)).toEqual(['order'])
  })
  it('all shows everything, newest first', () => {
    const out = filterAndSort(list, { status: 'new', category: 'all', sort: 'newest' }, CATS)
    expect(out.map((v) => v.captured_at)).toEqual([3, 2, 1])
  })
})
