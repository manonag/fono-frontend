'use client'

// Nested voicemail surface for the coexistence kiosk (CD handoff
// coexistence/coexist.jsx NestedVoicemailSurface, CHIRAN arch fact #362).
//
// The REAL Layout C voicemail treatment, nested under the SLA kiosk's
// Voicemails tab. It reuses the standalone Layout C shell verbatim — the
// styles.module .root token scope + 56px|1fr binder grid (so the v2.3 cards
// keep their .root[data-theme='dark'] dark-mode selectors), the .spine rail,
// the exported VerticalBinderStrip category spine, and VoicemailList — with
// two deltas: (1) no logo / live-foot (the SLA header already carries
// identity), and (2) the New/Resolved/Hidden status control is lifted into the
// SLA top bar, so `tab` arrives as a prop instead of being owned here.
//
// The root is pinned (absolute, auto height) so it fills the SLA body instead
// of the standalone full-viewport height.

import { useMemo } from 'react'
import { VerticalBinderStrip } from '../BinderSpine'
import { bucketKey } from '../helpers'
import { VoicemailList } from '../VoicemailList'
import styles from '../styles.module.css'
import type { BinderOption } from '../useBinderStrip'
import type {
  Category,
  CategoryFilter,
  IntentKey,
  Status,
  Voicemail,
} from '../types'

interface NestedVoicemailSurfaceProps {
  tab: Status
  category: CategoryFilter
  setCategory: (c: CategoryFilter) => void
  voicemails: Voicemail[]
  categories: Category[]
  dark: boolean
  onStatusChange: (id: string, status: Status) => void
  onReclassify: (id: string, key: IntentKey) => void
}

export function NestedVoicemailSurface({
  tab,
  category,
  setCategory,
  voicemails,
  categories,
  dark,
  onStatusChange,
  onReclassify,
}: NestedVoicemailSurfaceProps) {
  // Spine category tabs: "All" + one per tenant category, each counted within
  // the active status tab (matches the standalone KioskPage computation).
  const categoryOptions = useMemo<BinderOption<CategoryFilter>[]>(() => {
    const inTab = voicemails.filter((v) => v.status === tab)
    const surfaced = new Set(categories.map((c) => c.key))
    return [
      { value: 'all', label: 'All', count: inTab.length },
      ...categories.map((c) => ({
        value: c.key,
        label: c.display,
        count: inTab.filter((v) => bucketKey(v.intent_category_key, surfaced) === c.key).length,
      })),
    ]
  }, [voicemails, tab, categories])

  return (
    <div
      className={styles.root}
      data-theme={dark ? 'dark' : 'light'}
      // Pin into the SLA body: the standalone .root is full-viewport (height
      // 100dvh, position relative); here it fills the cross-fading body.
      style={{ position: 'absolute', inset: 0, height: 'auto', minHeight: 0 }}
    >
      <aside className={styles.spine}>
        <VerticalBinderStrip
          value={category}
          onChange={setCategory}
          options={categoryOptions}
        />
      </aside>

      <main className={styles.layoutMainC}>
        <VoicemailList
          tab={tab}
          category={category}
          voicemails={voicemails}
          categories={categories}
          onStatusChange={onStatusChange}
          onReclassify={onReclassify}
        />
      </main>
    </div>
  )
}
