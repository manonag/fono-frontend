'use client'

// Voicemail list for the voicemail-route kiosk (Direction A - receipt).
// Owns the local category-filter + sort state, renders the filter row (New
// tab only), and renders either the per-tab EmptyState or the list of
// VoicemailCard / ProcessingCard. Single-column 1-up density for v1 -
// 2-up / list density is deferred (brief section 9).

import { useEffect, useState } from 'react'
import { CategoryFilterRow } from './CategoryFilterRow'
import { EmptyState } from './EmptyState'
import { filterAndSort, isProcessing } from './helpers'
import { ProcessingCard } from './ProcessingCard'
import { VoicemailCard } from './VoicemailCard'
import type {
  Category,
  CategoryFilter,
  IntentKey,
  SortOrder,
  Status,
  Voicemail,
} from './types'

interface VoicemailListProps {
  tab: Status
  voicemails: Voicemail[]
  categories: Category[]
  onStatusChange: (id: string, status: Status) => void
  onReclassify: (id: string, key: IntentKey) => void
}

export function VoicemailList({
  tab,
  voicemails,
  categories,
  onStatusChange,
  onReclassify,
}: VoicemailListProps) {
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [sort, setSort] = useState<SortOrder>('newest')

  // Category filter resets on tab change (CD README "Interactions").
  useEffect(() => {
    setCategory('all')
  }, [tab])

  // The filter chips exist on the New tab only; Resolved / Hidden are
  // chronological and unfiltered.
  const activeCategory: CategoryFilter = tab === 'new' ? category : 'all'
  const list = filterAndSort(voicemails, { status: tab, category: activeCategory, sort })

  return (
    <>
      {tab === 'new' ? (
        <CategoryFilterRow
          value={category}
          onChange={setCategory}
          categories={categories}
          sort={sort}
          onSortChange={setSort}
        />
      ) : null}

      {list.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <main className="grid grid-cols-1 gap-4 pt-[18px]">
          {list.map((vm, i) =>
            isProcessing(vm) ? (
              <ProcessingCard key={vm.id} voicemail={vm} index={i} />
            ) : (
              <VoicemailCard
                key={vm.id}
                voicemail={vm}
                index={i}
                categories={categories}
                density="one"
                onStatusChange={onStatusChange}
                onReclassify={onReclassify}
              />
            ),
          )}
        </main>
      )}
    </>
  )
}
