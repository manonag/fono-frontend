'use client'

import { useEffect, useRef } from 'react'

interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning'
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  const isDanger = variant === 'danger'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel()
      }}
    >
      <div
        className="bg-white"
        style={{
          borderRadius: 20,
          padding: '28px 32px',
          maxWidth: 420,
          width: '90%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div className="flex items-center gap-3" style={{ marginBottom: 16 }}>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: isDanger ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDanger ? '#EF4444' : '#F59E0B'} strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1E0E00' }}>{title}</h3>
        </div>

        <p style={{ fontSize: 14, color: '#5C3D22', lineHeight: 1.6, marginBottom: 24 }}>
          {description}
        </p>

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 600,
              color: '#8B7355',
              backgroundColor: 'rgba(0,0,0,0.04)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="transition-colors"
            style={{
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
              backgroundColor: isDanger ? '#EF4444' : '#F59E0B',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
