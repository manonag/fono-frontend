'use client'
import { useState, useEffect } from 'react'

const ORANGE = '#D4652C'
const MID_ORANGE = '#D97B4A'
const LIGHT_ORANGE = '#E09568'
const PALE_ORANGE = '#E8B08A'

interface FonoLogoProps {
  size?: number
  textColor?: string
  mode?: 'light' | 'dark' | 'orange'
  className?: string
}

export default function FonoLogo({ size = 30, textColor = '#2C1810', mode = 'light', className }: FonoLogoProps) {
  const [metrics, setMetrics] = useState<{
    fWidth: number; oWidth: number; noWidth: number;
    baseline: number; oCenterY: number;
    coreRadius: number; dotCx: number;
  } | null>(null)

  const weight = 800
  const isOrange = mode === 'orange'
  const coreColor = isOrange ? '#fff' : ORANGE
  const ringColor = isOrange ? 'rgba(255,255,255,0.6)' : ORANGE
  const ring1Fill = isOrange ? 'rgba(255,255,255,0.38)' : MID_ORANGE
  const ring2Fill = isOrange ? 'rgba(255,255,255,0.22)' : LIGHT_ORANGE
  const ring3Fill = isOrange ? 'rgba(255,255,255,0.12)' : PALE_ORANGE

  useEffect(() => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.font = `${weight} ${size}px Nunito, sans-serif`

    const fWidth = ctx.measureText('f').width
    const oWidth = ctx.measureText('o').width
    const noWidth = ctx.measureText('no').width
    const xHeight = size * 0.52
    const baseline = size * 0.78
    const oCenterY = baseline - (xHeight / 2)
    const coreRadius = (xHeight / 2) * 0.72
    const dotCx = fWidth + oWidth / 2

    setMetrics({ fWidth, oWidth, noWidth, baseline, oCenterY, coreRadius, dotCx })
  }, [size])

  if (!metrics) return <div style={{ width: size * 2.2, height: size }} />

  const noX = metrics.fWidth + metrics.oWidth
  const maxPulseRadius = metrics.coreRadius * 2.0
  const svgWidth = noX + metrics.noWidth + 4
  const svgHeight = size * 1.1

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      style={{ overflow: 'visible', display: 'block' }}
      className={className}
    >
      {/* "f" */}
      <text x={0} y={metrics.baseline} fontFamily="var(--font-nunito), Nunito, sans-serif" fontWeight={weight} fontSize={size} fill={textColor}>f</text>

      <g>
        {/* Static concentric rings */}
        <circle cx={metrics.dotCx} cy={metrics.oCenterY} r={metrics.coreRadius * 1.85} fill={ring3Fill} />
        <circle cx={metrics.dotCx} cy={metrics.oCenterY} r={metrics.coreRadius * 1.55} fill={ring2Fill} />
        <circle cx={metrics.dotCx} cy={metrics.oCenterY} r={metrics.coreRadius * 1.28} fill={ring1Fill} />

        {/* Animated pulse rings */}
        {[0, 0.7, 1.4].map((delay, i) => (
          <circle key={i} cx={metrics.dotCx} cy={metrics.oCenterY} r={metrics.coreRadius}
            fill="none" stroke={ringColor} strokeWidth={size * 0.02 + 1} opacity={0}>
            <animate attributeName="r" from={metrics.coreRadius} to={maxPulseRadius} dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" from={0.6 - i * 0.15} to="0" dur="2.4s" begin={`${delay}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Core — big solid circle with heartbeat */}
        <circle cx={metrics.dotCx} cy={metrics.oCenterY} r={metrics.coreRadius} fill={coreColor}
          style={{ transformOrigin: `${metrics.dotCx}px ${metrics.oCenterY}px`, animation: 'core-beat 2.4s ease-in-out infinite' }} />
      </g>

      {/* "no" */}
      <text x={noX} y={metrics.baseline} fontFamily="var(--font-nunito), Nunito, sans-serif" fontWeight={weight} fontSize={size} fill={textColor}>no</text>
    </svg>
  )
}
