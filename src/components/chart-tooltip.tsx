'use client'

export interface ChartTooltipState {
  x: number
  y: number
  content: string
}

interface ChartTooltipProps {
  state: ChartTooltipState | null
}

export function ChartTooltip({ state }: ChartTooltipProps) {
  if (!state) return null
  return (
    <div
      className="pointer-events-none absolute z-20 rounded bg-gray-900 text-white text-xs font-medium px-2 py-1 whitespace-nowrap shadow-lg"
      style={{
        left: state.x,
        top: state.y - 4,
        transform: 'translate(-50%, -100%)',
      }}
    >
      {state.content}
    </div>
  )
}

export function tooltipPositionFromEvent(
  e: { currentTarget: Element },
  container: HTMLElement | null
): { x: number; y: number } | null {
  if (!container) return null
  const targetRect = (e.currentTarget as Element).getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  return {
    x: targetRect.left + targetRect.width / 2 - containerRect.left,
    y: targetRect.top - containerRect.top,
  }
}
