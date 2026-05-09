'use client'

interface VerifiedEditorProps {
  value: string
}

export function VerifiedEditor({ value }: VerifiedEditorProps) {
  return (
    <div className="px-4 py-3">
      <span className="block text-sm font-semibold text-ink mb-1">
        Verified Transcript
      </span>
      <span className="block text-xs text-brown mb-2">
        Auto-computed from segments above. Edit segments to change this. Native scripts
        welcome.
      </span>
      <div
        className="w-full bg-ink/5 border border-ink/10 rounded px-3 py-2 text-sm text-ink/80 leading-relaxed whitespace-pre-wrap min-h-[3rem]"
        aria-live="polite"
      >
        {value.trim() || (
          <span className="text-brown italic">
            (empty — edit a segment above to populate)
          </span>
        )}
      </div>
    </div>
  )
}
