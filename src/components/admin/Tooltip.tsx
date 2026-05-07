'use client'

import type { ReactNode } from 'react'

interface TooltipProps {
  children: ReactNode
  text: ReactNode
}

export function Tooltip({ children, text }: TooltipProps) {
  return (
    <span className="tooltip-trigger" tabIndex={0}>
      {children}
      <span className="tooltip-text" role="tooltip">{text}</span>
    </span>
  )
}
