'use client'

// Voicemail list for the Layout C voicemail kiosk (v2.3 - binder-tab).
//
// The scrolling card region: a 2-up grid that fills the main column and
// scrolls internally while the binder spine and the top strip stay pinned.
// Filtering happens here - by the status `tab` (top strip) and the spine
// `category` - both arriving as props now that KioskPage owns that state.
//
// Density is user-controlled via the top-bar toggle (T-228): 1-up / 2-up /
// list, arriving as the `density` prop. The sort is locked to newest-first
// (the oldest-first toggle is deferred for Layout C - brief section 8). The
// v1 CategoryFilterRow and the isProcessing -> ProcessingCard branch are both
// gone: filters live on the spine now, and VoicemailCard renders its own
// processing state internally.

import { EmptyState } from './EmptyState'
import { filterAndSort } from './helpers'
import styles from './styles.module.css'
import { VoicemailCard } from './VoicemailCard'
import type {
  Category,
  CategoryFilter,
  Density,
  IntentKey,
  Status,
  Voicemail,
} from './types'

interface VoicemailListProps {
  tab: Status
  category: CategoryFilter
  voicemails: Voicemail[]
  categories: Category[]
  density: Density
  onStatusChange: (id: string, status: Status) => void
  onReclassify: (id: string, key: IntentKey) => void
}

export function VoicemailList({
  tab,
  category,
  voicemails,
  categories,
  density,
  onStatusChange,
  onReclassify,
}: VoicemailListProps) {
  const list = filterAndSort(voicemails, { status: tab, category, sort: 'newest' })

  return (
    <div className={styles.cardGridC} data-density={density}>
      {list.length === 0 ? (
        // The grid is two columns only at 2-up density; the empty state
        // spans the full row in every case.
        <div className={density === 'two' ? 'col-span-2' : 'col-span-1'}>
          <EmptyState tab={tab} />
        </div>
      ) : (
        list.map((vm, i) => (
          <VoicemailCard
            key={vm.id}
            voicemail={vm}
            index={i}
            categories={categories}
            density={density}
            onStatusChange={onStatusChange}
            onReclassify={onReclassify}
          />
        ))
      )}
    </div>
  )
}
