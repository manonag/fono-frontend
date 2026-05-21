'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFonoToken } from '@/hooks/use-fono-token'
import { AudioPlayer } from '../components/AudioPlayer'
import { ResizableSplit } from '../components/ResizableSplit'
import { LabelingApiError, fetchMe } from '../lib/api'
import {
  AdjudicationApiError,
  fetchAudio,
  fetchRulings,
  postRuling,
} from './lib/api'
import { parseCsvObjects } from './lib/csv'
import {
  CORRECTION_LABELS,
  type AudioResolution,
  type CorrectionLabel,
  type DifferRow,
  type Ruling,
  type RulingVerb,
  type SeedRow,
} from './lib/types'

type AuthState = 'loading' | 'allowed' | 'denied' | 'unauthenticated'

const TAG_STYLES: Record<string, string> = {
  PROMPT: 'bg-danger/15 text-danger',
  CONTESTABLE_GOLD: 'bg-warning/20 text-ink',
  BOUNDARY: 'bg-ink/10 text-brown',
}

function TagChip({ tag }: { tag: string }) {
  if (!tag) return null
  const cls = TAG_STYLES[tag] ?? 'bg-ink/10 text-brown'
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>
      {tag}
    </span>
  )
}

export default function AdjudicatePage() {
  const token = useFonoToken()
  const [authState, setAuthState] = useState<AuthState>('loading')

  // Load step
  const [evalName, setEvalName] = useState('')
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [seedFile, setSeedFile] = useState<File | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Review step
  const [report, setReport] = useState<DifferRow[] | null>(null)
  const [seedByRow, setSeedByRow] = useState<Record<string, SeedRow>>({})
  const [rulingByRow, setRulingByRow] = useState<Record<string, Ruling>>({})
  const [currentIdx, setCurrentIdx] = useState(0)

  const [audio, setAudio] = useState<AudioResolution | null>(null)
  const [audioLoading, setAudioLoading] = useState(false)

  const [verb, setVerb] = useState<RulingVerb>('KEEP')
  const [correctTo, setCorrectTo] = useState<CorrectionLabel>('order')
  const [reasonText, setReasonText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const currentRow: DifferRow | null =
    report && report[currentIdx] ? report[currentIdx] : null
  const currentRowId = currentRow?.row_id ?? null

  // ── Auth gate (mirrors the labeling page) ──────────────────────────────────
  useEffect(() => {
    if (token === undefined) return
    if (!token) {
      setAuthState('unauthenticated')
      return
    }
    let cancelled = false
    fetchMe(token)
      .then(() => {
        if (!cancelled) setAuthState('allowed')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setAuthState(
          err instanceof LabelingApiError && err.status === 403
            ? 'denied'
            : 'unauthenticated',
        )
      })
    return () => {
      cancelled = true
    }
  }, [token])

  // ── Load the report + seed CSVs and any existing rulings ───────────────────
  const handleLoad = useCallback(async () => {
    if (!token || !reportFile || !seedFile || !evalName.trim()) return
    setLoading(true)
    setLoadError(null)
    try {
      const reportRows = parseCsvObjects(await reportFile.text())
      const seedRows = parseCsvObjects(await seedFile.text())
      if (reportRows.length === 0) {
        setLoadError('The DIFFER report CSV has no rows.')
        return
      }
      const rows: DifferRow[] = reportRows.map((r) => ({
        row_id: r.row_id ?? '',
        gold: r.gold ?? '',
        predicted: r.predicted ?? '',
        reason: r.reason ?? '',
        tag: r.tag ?? '',
        transcript: r.transcript ?? '',
      }))
      if (rows.some((r) => !r.row_id)) {
        setLoadError('The DIFFER report CSV is missing row_id values.')
        return
      }
      const seed: Record<string, SeedRow> = {}
      for (const s of seedRows) {
        if (!s.row_id) continue
        seed[s.row_id] = {
          row_id: s.row_id,
          tag: s.tag ?? '',
          note: s.note ?? '',
          listen_for: s.listen_for ?? '',
        }
      }
      const rulings = await fetchRulings(token, evalName.trim())
      const ruledMap: Record<string, Ruling> = {}
      for (const ruling of rulings) ruledMap[ruling.row_id] = ruling

      setReport(rows)
      setSeedByRow(seed)
      setRulingByRow(ruledMap)
      setCurrentIdx(0)
    } catch (err) {
      const msg =
        err instanceof AdjudicationApiError
          ? `${err.status}: ${err.detail}`
          : 'Could not load the files. Check they are valid CSVs.'
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }, [token, reportFile, seedFile, evalName])

  // ── Fetch audio whenever the selected row changes ──────────────────────────
  useEffect(() => {
    if (authState !== 'allowed' || !token || !currentRowId) {
      setAudio(null)
      return
    }
    let cancelled = false
    setAudioLoading(true)
    setAudio(null)
    fetchAudio(token, currentRowId)
      .then((res) => {
        if (!cancelled) setAudio(res)
      })
      .catch(() => {
        if (!cancelled) {
          setAudio({
            row_id: currentRowId,
            recording_id: null,
            available: false,
            audio_url: null,
            reason: 'audio lookup failed',
          })
        }
      })
      .finally(() => {
        if (!cancelled) setAudioLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authState, token, currentRowId])

  // ── Prefill the ruling form from any existing ruling for this row ──────────
  useEffect(() => {
    setSubmitError(null)
    if (!currentRowId) return
    const existing = rulingByRow[currentRowId]
    if (!existing) {
      setVerb('KEEP')
      setCorrectTo('order')
      setReasonText('')
      return
    }
    if (existing.new_gold === 'KEEP') {
      setVerb('KEEP')
    } else if (existing.new_gold === 'UNSCOREABLE') {
      setVerb('UNSCOREABLE')
    } else {
      setVerb('CORRECT')
      setCorrectTo(existing.new_gold as CorrectionLabel)
    }
    setReasonText(existing.reason ?? '')
  }, [currentRowId, rulingByRow])

  const ruledCount = useMemo(
    () =>
      report
        ? report.filter((r) => rulingByRow[r.row_id] !== undefined).length
        : 0,
    [report, rulingByRow],
  )

  const handleSubmit = useCallback(async () => {
    if (!token || !currentRow) return
    const newGold =
      verb === 'KEEP' ? 'KEEP' : verb === 'UNSCOREABLE' ? 'UNSCOREABLE' : correctTo
    setSubmitting(true)
    setSubmitError(null)
    try {
      const ruling = await postRuling(token, {
        eval_name: evalName.trim(),
        row_id: currentRow.row_id,
        old_gold: currentRow.gold,
        new_gold: newGold,
        reason: reasonText.trim() || null,
      })
      setRulingByRow((prev) => ({ ...prev, [ruling.row_id]: ruling }))
      // Advance to the next row that has no ruling yet.
      if (report) {
        const after = report
          .slice(currentIdx + 1)
          .findIndex((r) => rulingByRow[r.row_id] === undefined)
        if (after !== -1) setCurrentIdx(currentIdx + 1 + after)
        else if (currentIdx + 1 < report.length) setCurrentIdx(currentIdx + 1)
      }
    } catch (err) {
      setSubmitError(
        err instanceof AdjudicationApiError
          ? `${err.status}: ${err.detail}`
          : 'Could not save the ruling.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [token, currentRow, verb, correctTo, evalName, reasonText, report, currentIdx, rulingByRow])

  // ── Render: auth gates ─────────────────────────────────────────────────────
  if (authState === 'loading') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <p className="text-brown">Checking access...</p>
      </main>
    )
  }
  if (authState === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <p>You need to sign in to view this page.</p>
      </main>
    )
  }
  if (authState === 'denied') {
    return (
      <main className="min-h-screen bg-cream text-ink p-8 font-sans">
        <h1 className="text-2xl font-bold mb-2">No admin access</h1>
        <p className="text-brown">
          Your account does not have access to the Fono admin dashboard.
        </p>
      </main>
    )
  }

  // ── Render: load step ──────────────────────────────────────────────────────
  if (!report) {
    return (
      <div className="min-h-screen bg-cream text-ink font-sans">
        <header className="bg-ink text-cream px-6 py-3">
          <h1 className="text-xl font-bold">Eval Gold Adjudication</h1>
          <p className="text-xs text-cream/70">
            T-299 - rule on eval DIFFER rows by ear
          </p>
        </header>
        <main className="max-w-xl p-8 space-y-5">
          <p className="text-sm text-brown">
            Load an eval DIFFER report and its seed. Rulings are written to the
            append-only gold_adjudications overlay; the report and seed stay on
            this machine.
          </p>
          <label className="block text-sm">
            <span className="font-semibold">Eval name</span>
            <input
              type="text"
              value={evalName}
              onChange={(e) => setEvalName(e.target.value)}
              placeholder="gate5_v2_2026_05_20"
              className="mt-1 w-full border border-ink/20 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-terra"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">DIFFER report CSV</span>
            <span className="text-brown"> (row_id, gold, predicted, reason, tag, transcript)</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Seed CSV</span>
            <span className="text-brown"> (row_id, tag, note, listen_for)</span>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setSeedFile(e.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleLoad}
            disabled={loading || !reportFile || !seedFile || !evalName.trim()}
            className="px-4 py-2 rounded font-semibold text-sm bg-terra text-white hover:bg-terra-dark disabled:bg-terra/30 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load report'}
          </button>
          {loadError && (
            <p className="text-sm text-danger font-medium">{loadError}</p>
          )}
        </main>
      </div>
    )
  }

  // ── Render: review step ────────────────────────────────────────────────────
  const seed = currentRowId ? seedByRow[currentRowId] : undefined
  const existingRuling = currentRowId ? rulingByRow[currentRowId] : undefined

  const queue = (
    <div className="h-full overflow-y-auto bg-white">
      {report.map((r, idx) => {
        const ruled = rulingByRow[r.row_id] !== undefined
        const selected = idx === currentIdx
        return (
          <button
            key={r.row_id}
            type="button"
            onClick={() => setCurrentIdx(idx)}
            className={`w-full text-left px-3 py-2 border-b border-ink/5 text-xs ${
              selected ? 'bg-terra/10' : 'hover:bg-ink/5'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-brown w-8">#{idx + 1}</span>
              <span className="flex-1 truncate">
                {r.gold} {'→'} {r.predicted}
              </span>
              {ruled && <span className="text-success font-bold">{'✓'}</span>}
            </div>
            <div className="mt-0.5 flex items-center gap-2 pl-10">
              <TagChip tag={r.tag} />
            </div>
          </button>
        )
      })}
    </div>
  )

  const detail = (
    <div className="h-full overflow-y-auto bg-cream p-5 space-y-4">
      {currentRow && (
        <>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-brown">
              row #{currentIdx + 1} of {report.length} {'·'} {currentRow.row_id}
            </span>
            <TagChip tag={currentRow.tag} />
          </div>

          <div className="bg-white border border-ink/10 rounded p-3 text-sm">
            <div className="flex gap-6">
              <span>
                <span className="text-brown">gold </span>
                <span className="font-semibold">{currentRow.gold}</span>
              </span>
              <span>
                <span className="text-brown">predicted </span>
                <span className="font-semibold">{currentRow.predicted}</span>
              </span>
            </div>
            <p className="mt-1 text-brown text-xs">
              model reason: {currentRow.reason || '(none)'}
            </p>
          </div>

          {audioLoading && <p className="text-xs text-brown">Loading audio...</p>}
          {audio && audio.available && audio.audio_url ? (
            <AudioPlayer key={audio.audio_url} src={audio.audio_url} />
          ) : (
            audio && (
              <p className="text-xs text-danger bg-danger/10 rounded px-3 py-2">
                Audio unavailable: {audio.reason ?? 'unknown reason'}
              </p>
            )
          )}

          <div>
            <p className="text-xs font-semibold text-brown mb-1">Transcript</p>
            <p className="bg-white border border-ink/10 rounded p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {currentRow.transcript || '(empty)'}
            </p>
          </div>

          {seed && (seed.note || seed.listen_for) && (
            <div className="bg-warning/10 border border-warning/30 rounded p-3 text-xs space-y-1">
              <p className="font-semibold text-ink">Reviewer guidance</p>
              {seed.note && (
                <p>
                  <span className="text-brown">note: </span>
                  {seed.note}
                </p>
              )}
              {seed.listen_for && (
                <p>
                  <span className="text-brown">listen for: </span>
                  {seed.listen_for}
                </p>
              )}
            </div>
          )}

          <div className="bg-white border border-ink/10 rounded p-3 space-y-3">
            <p className="text-xs font-semibold text-brown">
              Ruling
              {existingRuling && (
                <span className="ml-2 font-normal text-success">
                  (already ruled {'→'} {existingRuling.new_gold}; re-ruling appends)
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              {(['KEEP', 'CORRECT', 'UNSCOREABLE'] as RulingVerb[]).map((v) => (
                <label key={v} className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    name="verb"
                    checked={verb === v}
                    onChange={() => setVerb(v)}
                  />
                  <span>
                    {v === 'KEEP' && 'Keep (gold is right)'}
                    {v === 'CORRECT' && 'Correct to'}
                    {v === 'UNSCOREABLE' && 'Unscoreable'}
                  </span>
                </label>
              ))}
              {verb === 'CORRECT' && (
                <select
                  value={correctTo}
                  onChange={(e) => setCorrectTo(e.target.value as CorrectionLabel)}
                  className="border border-ink/20 rounded px-2 py-1 text-sm focus:outline-none focus:border-terra"
                >
                  {CORRECTION_LABELS.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Reason (what the audio showed)"
              rows={2}
              className="w-full border border-ink/20 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-terra"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="text-xs text-brown hover:text-ink underline disabled:opacity-40"
              >
                {'←'} prev
              </button>
              <button
                type="button"
                onClick={() =>
                  setCurrentIdx(Math.min(report.length - 1, currentIdx + 1))
                }
                disabled={currentIdx >= report.length - 1}
                className="text-xs text-brown hover:text-ink underline disabled:opacity-40"
              >
                next {'→'}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="ml-auto px-4 py-2 rounded font-semibold text-sm bg-terra text-white hover:bg-terra-dark disabled:bg-terra/30"
              >
                {submitting ? 'Saving...' : 'Save ruling'}
              </button>
            </div>
            {submitError && (
              <p className="text-xs text-danger font-medium">{submitError}</p>
            )}
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-cream text-ink font-sans overflow-hidden">
      <header className="bg-ink text-cream px-6 py-3 flex-none flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Eval Gold Adjudication</h1>
          <p className="text-xs text-cream/70">
            {evalName} {'·'} {ruledCount}/{report.length} ruled
          </p>
        </div>
        <a href="/admin/labeling" className="text-xs text-cream/70 hover:text-cream underline">
          {'←'} Labeling
        </a>
      </header>
      <ResizableSplit
        className="flex-1 min-h-0"
        initialLeftWidth="30%"
        minWidth={220}
        left={queue}
        right={detail}
      />
    </div>
  )
}
