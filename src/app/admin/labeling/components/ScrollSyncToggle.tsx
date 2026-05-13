'use client'

interface ScrollSyncToggleProps {
  enabled: boolean
  onToggle: () => void
}

/**
 * Floating bottom-right toggle that turns on/off bidirectional segment-
 * index scroll sync across the three transcript columns. Used on the
 * reviewer page and the labeler suggestions view.
 */
export function ScrollSyncToggle({ enabled, onToggle }: ScrollSyncToggleProps) {
  const title = enabled
    ? 'Scroll sync ON. Click to disable.'
    : 'Scroll sync OFF. Click to align all three columns by segment.'
  const className = enabled
    ? 'bg-terra border-terra-dark text-white hover:bg-terra-dark'
    : 'bg-white border-ink/20 text-ink/60 hover:bg-cream'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Disable scroll sync' : 'Enable scroll sync across columns'}
      title={title}
      className={`fixed bottom-6 right-6 z-30 w-11 h-11 rounded-full shadow-lg border flex items-center justify-center transition-colors ${className}`}
    >
      <LinkIcon />
    </button>
  )
}

function LinkIcon() {
  // Inline two-loop chain icon; matches lucide's "link" silhouette without
  // adding a dependency. 18x18, inherits currentColor.
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}
