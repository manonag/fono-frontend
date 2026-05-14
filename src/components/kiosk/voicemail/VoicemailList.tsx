'use client'

// Voicemail list for the Layout C voicemail kiosk (v2.3 - binder-tab).
//
// The scrolling card region: a 2-up grid that fills the main column and
// scrolls internally while the binder spine and the top strip stay pinned.
// Filtering happens here - by the status `tab` (top strip) and the spine
// `category` - both arriving as props now that KioskPage owns that state.
//
// Density is locked to 2-up (the toggle is deferred - brief section 8 /
// T-228) and the sort is locked to newest-first (the oldest-first toggle is
// deferred for Layout C - brief section 8). The v1 CategoryFilterRow and the
// isProcessing -> ProcessingCard branch are both gone: filters live on the
// spine now, and VoicemailCard renders its own processing state internally.

import { EmptyState } from './EmptyState'
import { filterAndSort } from './helpers'
import styles from './styles.module.css'
import { VoicemailCard } from './VoicemailCard'
import type {
  Category,
  CategoryFilter,
  IntentKey,
  Status,
  Voicemail,
} from './types'

interface VoicemailListProps {
  tab: Status
  category: CategoryFilter
  voicemails: Voicemail[]
  categories: Category[]
  onStatusChange: (id: string, status: Status) => void
  onReclassify: (id: string, key: IntentKey) => void
}

export function VoicemailList({
  tab,
  category,
  voicemails,
  categories,
  onStatusChange,
  onReclassify,
}: VoicemailListProps) {
  const list = filterAndSort(voicemails, { status: tab, category, sort: 'newest' })

  return (
    <div className={styles.cardGridC}>
      {list.length === 0 ? (
        <div className="col-span-2">
          <EmptyState tab={tab} />
        </div>
      ) : (
        list.map((vm, i) => (
          <VoicemailCard
            key={vm.id}
            voicemail={vm}
            index={i}
            categories={categories}
            onStatusChange={onStatusChange}
            onReclassify={onReclassify}
          />
        ))
      )}
    </div>
  )
}
