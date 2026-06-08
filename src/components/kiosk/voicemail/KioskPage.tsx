'use client'

// Page-level component for the voicemail-route kiosk (Layout C - binder-tab,
// v2.3). Owns the top-level state - current status `tab`, spine `category`
// filter, fetched `voicemails`, theme, sync time, toast - and the optimistic
// mutation handlers. The v1 horizontal header chrome + tab strip + filter row
// are gone: the shell is now a binder spine on the left edge and a horizontal
// status strip across the top of the cards area.
//
// `tab` and `category` are independent (the binder metaphor: the category
// divider you picked stays picked while you flip status tabs). Category
// counts in the spine are computed per the current tab.
//
// Tenant identity arrives as a prop - this component never reads it from the
// session directly. The route-level page (src/app/kiosk/page.tsx) resolves it
// from the impersonation context or the session and passes it down (CHIRAN
// principle #49 / brief section 7). Optimistic mutations update local state,
// persist, then roll back + toast on error - unchanged from v1.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchVoicemails, patchVoicemailIntent, patchVoicemailStatus } from '@/lib/api'
import { useFonoToken } from '@/hooks/use-fono-token'
import { BinderSpine } from './BinderSpine'
import { bucketKey, STATUSES, TAB_LABELS, tabCount } from './helpers'
import { HorizontalBinderStrip } from './HorizontalBinderStrip'
import styles from './styles.module.css'
import { Toast } from './Toast'
import { VoicemailList } from './VoicemailList'
import type {
  CategoryFilter,
  IntentKey,
  KioskPageProps,
  Status,
  Voicemail,
} from './types'
import type { BinderOption } from './useBinderStrip'

// Background refresh cadence. Matches the existing SLA kiosk; real-time
// push of new voicemails is out of scope (brief section 8).
const POLL_INTERVAL_MS = 30000

function applyStatus(v: Voicemail, status: Status): Voicemail {
  return {
    ...v,
    status,
    resolved_at: status === 'resolved' ? Date.now() : v.resolved_at,
    resolved_by: status === 'resolved' ? 'You' : v.resolved_by,
    hidden_at: status === 'hidden' ? Date.now() : v.hidden_at,
  }
}

export function KioskPage({ tenant }: KioskPageProps) {
  const token = useFonoToken()

  const [tab, setTab] = useState<Status>('new')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [voicemails, setVoicemails] = useState<Voicemail[]>([])
  const [loading, setLoading] = useState(true)
  const [syncAt, setSyncAt] = useState<number | null>(null)
  // The receipt aesthetic is paper-first, so light is the default theme.
  const [dark, setDark] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // --- data load (mock-backed until the voicemail backend ships) + poll ---
  const load = useCallback(async () => {
    const data = await fetchVoicemails(tenant.id, token)
    setVoicemails(data)
    setSyncAt(Date.now())
    setLoading(false)
  }, [tenant.id, token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = setInterval(() => {
      void load()
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  // --- mutations: optimistic update, persist, roll back + toast on error --
  const dismissToast = useCallback(() => setToast(null), [])

  const onStatusChange = useCallback(
    async (id: string, status: Status) => {
      // Snapshot for rollback. Event handlers always run the latest
      // callback instance, so this closes over the current voicemails.
      const snapshot = voicemails
      setVoicemails((prev) => prev.map((v) => (v.id === id ? applyStatus(v, status) : v)))
      try {
        await patchVoicemailStatus(id, status, token)
      } catch {
        setVoicemails(snapshot)
        setToast('Could not update the voicemail. Reverted.')
      }
    },
    [voicemails, token],
  )

  const onReclassify = useCallback(
    async (id: string, key: IntentKey) => {
      const display = tenant.categories.find((c) => c.key === key)?.display ?? key
      const snapshot = voicemails
      setVoicemails((prev) =>
        prev.map((v) =>
          v.id === id
            ? {
                ...v,
                intent_category_key: key,
                intent_category_display_at_capture: display,
              }
            : v,
        ),
      )
      try {
        await patchVoicemailIntent(id, key, token)
      } catch {
        setVoicemails(snapshot)
        setToast('Could not reclassify the voicemail. Reverted.')
      }
    },
    [voicemails, tenant.categories, token],
  )

  // Spine category tabs: "All" + one per tenant category, each counted
  // within the currently selected status tab.
  const categoryOptions = useMemo<BinderOption<CategoryFilter>[]>(() => {
    const inTab = voicemails.filter((v) => v.status === tab)
    // Counts bucket unsurfaced intents into "others" so the tab totals match
    // what filterAndSort actually shows under each category.
    const surfaced = new Set(tenant.categories.map((c) => c.key))
    return [
      { value: 'all', label: 'All', count: inTab.length },
      ...tenant.categories.map((c) => ({
        value: c.key,
        label: c.display,
        count: inTab.filter((v) => bucketKey(v.intent_category_key, surfaced) === c.key).length,
      })),
    ]
  }, [voicemails, tab, tenant.categories])

  // Top strip status tabs: New / Resolved / Hidden, counted across all.
  const statusOptions = useMemo<BinderOption<Status>[]>(
    () =>
      STATUSES.map((s) => ({
        value: s,
        label: TAB_LABELS[s],
        count: tabCount(voicemails, s),
      })),
    [voicemails],
  )

  return (
    <div className={styles.root} data-theme={dark ? 'dark' : 'light'}>
      <BinderSpine
        tenant={tenant}
        dark={dark}
        onToggleTheme={() => setDark((d) => !d)}
        categoryOptions={categoryOptions}
        category={category}
        setCategory={setCategory}
        syncAt={syncAt}
      />

      <main className={styles.layoutMainC}>
        <HorizontalBinderStrip value={tab} onChange={setTab} options={statusOptions} />

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-rcp-mono text-[11px] uppercase tracking-[0.14em] text-rcp-brown">
              Loading voicemails&hellip;
            </p>
          </div>
        ) : (
          <VoicemailList
            tab={tab}
            category={category}
            voicemails={voicemails}
            categories={tenant.categories}
            onStatusChange={onStatusChange}
            onReclassify={onReclassify}
          />
        )}
      </main>

      {toast ? <Toast message={toast} onDismiss={dismissToast} /> : null}
    </div>
  )
}
