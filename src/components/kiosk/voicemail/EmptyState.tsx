'use client'

// Per-tab empty states for the voicemail-route kiosk (Direction A - receipt).
// Intentional, not blank: a dashed card, three Terra dots at rising opacity
// as a calm signal, then a headline + body line. Ported from
// design_handoff_voicemail_kiosk (RcpEmpty).

import type { Status } from './types'

interface EmptyStateProps {
  tab: Status
}

const IGNORE_COPY = {
  title: 'No ignored voicemails.',
  line: 'Anything you ignore stays here in case you change your mind.',
}

const COPY: Record<Status, { title: string; line: string }> = {
  new: {
    title: 'All clear.',
    line: 'No voicemails waiting. The line is open.',
  },
  resolved: {
    title: 'Nothing resolved yet today.',
    line: 'Tickets you finish will land here for the record.',
  },
  // T-418: 'ignore' is the punch-surface label. 'hidden' keeps its today copy
  // for the OFF path (byte-identical); the punch surface never shows it.
  ignore: IGNORE_COPY,
  hidden: {
    title: 'No hidden voicemails.',
    line: 'Anything you hide stays here in case you change your mind.',
  },
  spam: {
    title: 'No spam.',
    line: 'Voicemails you mark as spam land here, with their numbers blocked.',
  },
}

const DOT_OPACITY = [0.25, 0.5, 0.85]

export function EmptyState({ tab }: EmptyStateProps) {
  const { title, line } = COPY[tab]
  return (
    <div className="mx-auto my-[60px] max-w-[380px] rounded-lg border border-dashed border-rcp-rule px-6 py-8 text-center">
      <div className="mb-3.5 inline-flex gap-1.5" aria-hidden="true">
        {DOT_OPACITY.map((opacity) => (
          <span
            key={opacity}
            className="h-2 w-2 rounded-full bg-rcp-terra-warm"
            style={{ opacity }}
          />
        ))}
      </div>
      <h3 className="mb-1.5 text-[22px] font-bold tracking-[-0.015em] text-rcp-text-strong">
        {title}
      </h3>
      <p className="text-[14px] leading-[1.55] text-rcp-brown">{line}</p>
    </div>
  )
}
