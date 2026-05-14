'use client'

// Voicemail list for the voicemail-route kiosk (Direction A - receipt).
// Owns the local category-filter + sort state, renders the filter row (New
// tab only), and renders either the per-tab EmptyState or the list of
// VoicemailCard / ProcessingCard. Ships the 2-up grid density (the column
// rules mirror the CD prototype's .rcp-grid--two: 2 columns, 14px gap).

import { useEffect, useState } from 'react'
import { CategoryFilterRow } from './CategoryFilterRow'
import { EmptyState } from './EmptyState'
import { filterAndSort, isProcessing } from './helpers'
import { ProcessingCard } from './ProcessingCard'
import { VoicemailCard } from './VoicemailCard'
import type {
  Category,
  CategoryFilter,
  Density,
  IntentKey,
  SortOrder,
  Status,
  Voicemail,
} from './types'

// Grid density. Brief section 9 deferred 2-up for v1; set to 'two' per the
// follow-up request to ship the 2-up grid. GRID_CLASS mirrors the CD
// prototype's .rcp-grid--* column rules.
const DENSITY: Density = 'two'
const GRID_CLASS: Record<Density, string> = {
  one: 'grid-cols-1 gap-4',
  two: 'grid-cols-2 gap-[14px]',
  list: 'grid-cols-1 gap-0',
}

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
        <main className={`grid pt-[18px] ${GRID_CLASS[DENSITY]}`}>
          {list.map((vm, i) =>
            isProcessing(vm) ? (
              <ProcessingCard key={vm.id} voicemail={vm} index={i} />
            ) : (
              <VoicemailCard
                key={vm.id}
                voicemail={vm}
                index={i}
                categories={categories}
                density={DENSITY}
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
