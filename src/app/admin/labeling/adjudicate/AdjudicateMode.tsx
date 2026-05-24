'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ResizableSplit } from '../components/ResizableSplit'
import { AdjudicatePane } from './AdjudicatePane'
import { AdjudicateQueuePane } from './AdjudicateQueuePane'
import { AdjudicationApiError, fetchRows, postRuling } from './lib/api'
import type {
  AdjudicationRow,
  CorrectionLabel,
  QueueFilterChip,
  RulingVerb,
} from './lib/types'

interface AdjudicateModeProps {
  token: string
}

// First (and only) eval the backend ships with: GATE 5 voicemail classifier
// v2 with v3.2 prompt. Wired here as a constant because the seed CSV path
// on the backend is fixed; adding more evals later means surfacing a
// dropdown and editing this single constant.
const DEFAULT_EVAL = 'gate5_v2'

// Per-tag expected ruling used by the "Agreement (preview)" headline.
// PROMPT means the seed believes the prompt made the model miss; gold is
// trustworthy and the expected ruling is KEEP.
// CONTESTABLE_GOLD means the seed flagged gold as contestable; the
// expected ruling is CORRECT.
// BOUNDARY is ambiguous by design (border-region calls); excluded from
// the agreement denominator.
function expectedAction(tag: string): 'KEEP' | 'CORRECT' | null {
  if (tag === 'PROMPT') return 'KEEP'
  if (tag === 'CONTESTABLE_GOLD') return 'CORRECT'
  return null
}

function actualAction(
  newGold: string,
  oldGold: string,
): 'KEEP' | 'CORRECT' | 'UNSCOREABLE' {
  if (newGold === 'UNSCOREABLE') return 'UNSCOREABLE'
  if (newGold === 'KEEP' || newGold === oldGold) return 'KEEP'
  return 'CORRECT'
}

export function AdjudicateMode({ token }: AdjudicateModeProps) {
  const [evalName] = useState(DEFAULT_EVAL)
  const [rows, setRows] = useState<AdjudicationRow[]>([])
  const [total, setTotal] = useState(0)
  const [ruledCount, setRuledCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<QueueFilterChip>('all')
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [saving, setSaving] = useState<'save' | 'save-next' | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showRerunHint, setShowRerunHint] = useState(false)

  const loadRows = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchRows(token, evalName)
      setRows(res.rows)
      setTotal(res.total)
      setRuledCount(res.ruled_count)
      setSelectedRowId((prev) => {
        if (prev && res.rows.find((r) => r.row_id === prev)) return prev
        return res.rows[0]?.row_id ?? null
      })
    } catch (err) {
      const msg =
        err instanceof AdjudicationApiError ? err.detail : 'Failed to load rows'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [token, evalName])

  useEffect(() => {
    void loadRows()
  }, [loadRows])

  // ── Derived state ──────────────────────────────────────────────────────

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows
    if (filter === 'unruled') return rows.filter((r) => r.ruling === null)
    return rows.filter((r) => r.tag === filter)
  }, [rows, filter])

  const chipCounts = useMemo<Record<QueueFilterChip, number>>(() => {
    const counts: Record<QueueFilterChip, number> = {
      all: rows.length,
      PROMPT: 0,
      CONTESTABLE_GOLD: 0,
      BOUNDARY: 0,
      unruled: 0,
    }
    for (const r of rows) {
      if (r.tag === 'PROMPT') counts.PROMPT += 1
      else if (r.tag === 'CONTESTABLE_GOLD') counts.CONTESTABLE_GOLD += 1
      else if (r.tag === 'BOUNDARY') counts.BOUNDARY += 1
      if (r.ruling === null) counts.unruled += 1
    }
    return counts
  }, [rows])

  const contestableTotal = chipCounts.CONTESTABLE_GOLD

  const selectedRow = useMemo(
    () => rows.find((r) => r.row_id === selectedRowId) ?? null,
    [rows, selectedRowId],
  )

  const hasNext = useMemo(() => {
    if (!selectedRowId) return false
    const idx = filteredRows.findIndex((r) => r.row_id === selectedRowId)
    return idx >= 0 && idx + 1 < filteredRows.length
  }, [filteredRows, selectedRowId])

  const agreementPreview = useMemo(() => {
    let matched = 0
    let denom = 0
    for (const r of rows) {
      if (r.ruling === null) continue
      const expected = expectedAction(r.tag)
      if (expected === null) continue
      denom += 1
      const actual = actualAction(r.ruling.new_gold, r.gold)
      if (actual === expected) matched += 1
    }
    return { matched, denom }
  }, [rows])

  const handleSave = useCallback(
    async (input: {
      verb: RulingVerb
      correctTo: CorrectionLabel | null
      note: string
      advance: boolean
    }) => {
      if (!selectedRow) return
      setSaveError(null)
      setSaving(input.advance ? 'save-next' : 'save')
      try {
        const newGold =
          input.verb === 'KEEP'
            ? 'KEEP'
            : input.verb === 'UNSCOREABLE'
              ? 'UNSCOREABLE'
              : (input.correctTo as string)
        const ruling = await postRuling(token, {
          eval_name: evalName,
          row_id: selectedRow.row_id,
          old_gold: selectedRow.gold,
          new_gold: newGold,
          reason: input.note || null,
        })
        // Optimistically patch this row's ruling so the queue badge and
        // counters update without an extra round trip; then reload in the
        // background to reconcile with the prod overlay (ruled_count is
        // authoritative from /rows).
        const wasUnruled = selectedRow.ruling === null
        setRows((prev) =>
          prev.map((r) =>
            r.row_id === selectedRow.row_id ? { ...r, ruling } : r,
          ),
        )
        if (wasUnruled) setRuledCount((prev) => prev + 1)
        if (input.advance) {
          const idx = filteredRows.findIndex(
            (r) => r.row_id === selectedRow.row_id,
          )
          const next = filteredRows[idx + 1] ?? null
          if (next) setSelectedRowId(next.row_id)
        }
        // Background reconcile, fire and forget.
        void loadRows()
      } catch (err) {
        const msg =
          err instanceof AdjudicationApiError ? err.detail : 'Save failed'
        setSaveError(msg)
      } finally {
        setSaving(null)
      }
    },
    [token, evalName, selectedRow, filteredRows, loadRows],
  )

  return (
    <>
      {/* Sub-header: eval name, Ruled X / 8 contestable, 39 total counter,
          Agreement (preview), non-executing Re-run GATE 5 affordance. */}
      <div className="flex-none bg-white border-b border-ink/10 px-6 py-2 flex items-center gap-6 flex-wrap text-xs relative">
        <div>
          <span className="text-brown">Eval:</span>{' '}
          <span className="font-mono font-semibold text-ink">{evalName}</span>
        </div>
        <div>
          <span className="text-brown">Ruled </span>
          <span className="font-semibold text-ink">{ruledCount}</span>
          <span className="text-brown"> / </span>
          <span className="font-semibold text-ink">{contestableTotal}</span>
          <span className="text-brown"> contestable, </span>
          <span className="font-semibold text-ink">{total}</span>
          <span className="text-brown"> total</span>
        </div>
        <div
          title="Share of ruled rows whose ruling matches the seed-tag expectation (PROMPT then KEEP, CONTESTABLE_GOLD then CORRECT). BOUNDARY rows excluded from the denominator."
        >
          <span className="text-brown">Agreement (preview):</span>{' '}
          <span className="font-semibold text-ink">
            {agreementPreview.denom > 0
              ? `${agreementPreview.matched} / ${agreementPreview.denom}`
              : '0 / 0'}
          </span>
        </div>
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setShowRerunHint((v) => !v)}
            className="px-2 py-1 text-brown hover:text-ink underline"
          >
            Re-run GATE 5...
          </button>
          {showRerunHint && (
            <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-ink/15 rounded shadow-lg p-3 text-xs w-[28rem] max-w-[90vw]">
              <p className="text-ink font-semibold mb-1">
                Scoring is not in-app.
              </p>
              <p className="text-brown mb-2">
                Rulings persist to gold_adjudications live. To re-score with
                the current overlay, run from the backend repo:
              </p>
              <pre className="bg-ink/5 px-2 py-1.5 rounded font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                python scripts/voice_training/gate5_revalidate_classifier.py --apply-overlay
              </pre>
              <button
                type="button"
                onClick={() => setShowRerunHint(false)}
                className="mt-2 text-brown hover:text-ink underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      <ResizableSplit
        className="flex-1 min-h-0"
        initialLeftWidth="33%"
        minWidth={240}
        left={
          <AdjudicateQueuePane
            rows={rows}
            filteredRows={filteredRows}
            chipCounts={chipCounts}
            filter={filter}
            selectedRowId={selectedRowId}
            loading={loading}
            error={error}
            onFilterChange={setFilter}
            onSelect={setSelectedRowId}
          />
        }
        right={
          <AdjudicatePane
            row={selectedRow}
            token={token}
            saving={saving}
            saveError={saveError}
            hasNext={hasNext}
            onSave={handleSave}
          />
        }
      />
    </>
  )
}
