'use client'

import { STATUSES, STATUS_LABELS, STATUS_RANK } from '../lib/enums'
import type { Status } from '../lib/enums'

interface SaveControlsProps {
  status: Status
  initialStatus: Status
  dirty: boolean
  saving: boolean
  saveError: string | null
  onStatusChange: (status: Status) => void
  onSave: () => void
  onSaveAndNext: () => void
  hasNext: boolean
}

export function SaveControls({
  status,
  initialStatus,
  dirty,
  saving,
  saveError,
  onStatusChange,
  onSave,
  onSaveAndNext,
  hasNext,
}: SaveControlsProps) {
  const minRank = STATUS_RANK[initialStatus]
  const allowed = STATUSES.filter((s) => STATUS_RANK[s] >= minRank)

  return (
    <div className="px-4 py-3 border-t border-ink/10 bg-white sticky bottom-0">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-ink">
          <span className="font-semibold mr-2">Status:</span>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as Status)}
            className="bg-white border border-ink/20 rounded px-2 py-1 text-sm focus:outline-none focus:border-terra"
          >
            {allowed.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className="px-4 py-2 rounded font-semibold text-sm bg-ink text-cream hover:bg-ink/90 disabled:bg-ink/30 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onSaveAndNext}
            disabled={saving || !hasNext}
            className="px-4 py-2 rounded font-semibold text-sm bg-terra text-white hover:bg-terra-dark disabled:bg-terra/30 disabled:cursor-not-allowed"
            title={hasNext ? 'Cmd/Ctrl+Enter' : 'No next pending recording'}
          >
            {saving ? 'Saving…' : 'Save and Next →'}
          </button>
        </div>
      </div>
      {saveError && (
        <p className="mt-2 text-xs text-red-700 font-medium">{saveError}</p>
      )}
    </div>
  )
}
