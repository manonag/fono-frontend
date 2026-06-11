'use client'

// Outbound-callback confirm modal, shared by the missed-call CALL BACK and the
// voicemail card callback in the coexistence kiosk. Presentational only: the
// caller leg rings first, then the team connects on answer. The parent owns the
// POST, the loading flag, and the open/close state.

interface CallConfirmModalProps {
  phone: string
  dark: boolean
  busy: boolean // disables Call now + shows the "Calling…" label
  onCancel: () => void
  onConfirm: () => void
}

export function CallConfirmModal({
  phone,
  dark,
  busy,
  onCancel,
  onConfirm,
}: CallConfirmModalProps) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: 360,
          backgroundColor: dark ? '#241910' : '#f7ebde',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e5d6c2'}`,
          borderRadius: 12,
          padding: '28px 24px 22px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            fontSize: 20,
            fontWeight: 700,
            color: dark ? '#f6e7da' : '#1e0e00',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {phone}
        </div>
        <p
          style={{
            fontSize: 13,
            color: dark ? '#9c8772' : '#8b7355',
            textAlign: 'center',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Customer rings first. Once they answer, your phone connects.
        </p>
        <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 6,
              border: `1px dashed ${dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`,
              background: 'none',
              color: dark ? '#f6e7da' : '#1e0e00',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 6,
              border: 'none',
              backgroundColor: '#16A34A',
              color: '#fff',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Calling…' : 'Call now'}
          </button>
        </div>
      </div>
    </div>
  )
}
