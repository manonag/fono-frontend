'use client'

import { useEffect, useRef, useState } from 'react'
import type { LabelerSummary } from '../lib/types'

// Phase C.3 Sprint 1 (Bite 4): owner picks a target labeler to reassign a
// claim to. Explicit, two-step (pick then confirm) so it is never a single
// misclick; the reassign itself is audit-logged server-side.

interface ReassignModalProps {
  open: boolean
  rowLabel: string
  currentHolderName: string | null
  labelers: LabelerSummary[]
  reassigning: boolean
  onCancel: () => void
  onConfirm: (userId: string) => void
}

export function ReassignModal({
  open,
  rowLabel,
  currentHolderName,
  labelers,
  reassigning,
  onCancel,
  onConfirm,
}: ReassignModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    if (open) setSelected('')
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel()
      }}
    >
      <div className="bg-white rounded-2xl p-7 w-[90%] max-w-md shadow-2xl">
        <h3 className="text-lg font-bold text-ink mb-1">Reassign claim</h3>
        <p className="text-sm text-brown mb-4 leading-relaxed">
          Recording {rowLabel}
          {currentHolderName ? ` is claimed by ${currentHolderName}.` : '.'} Pick a
          labeler to move this claim to. They will see it in their My Queue.
        </p>
        <label className="block text-xs font-semibold text-brown mb-1">
          Reassign to
        </label>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full bg-white border border-ink/20 rounded px-2 py-2 text-sm focus:outline-none focus:border-terra mb-5"
        >
          <option value="">Select a labeler…</option>
          {labelers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.email} ({u.counts.claimed ?? 0} claimed)
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-brown bg-ink/5 hover:bg-ink/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected || reassigning}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-terra hover:bg-terra-dark disabled:bg-terra/30 disabled:cursor-not-allowed"
          >
            {reassigning ? 'Reassigning…' : 'Reassign'}
          </button>
        </div>
      </div>
    </div>
  )
}
