'use client'

import { useRef, useState, useEffect } from 'react'

interface FonoLogoProps {
  size?: number
  textColor?: string
  circleColor?: string
  pulseColor?: string
  animated?: boolean
}

export function FonoLogo({
  size = 48,
  textColor = '#E0602A',
  circleColor = '#E0602A',
  pulseColor = '#E0602A',
  animated = true,
}: FonoLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [measurements, setMeasurements] = useState<{
    fonWidth: number
    oWidth: number
    fonoWidth: number
    gap: number
    radius: number
    cx: number
    cy: number
    strokeWidth: number
    dotR: number
    svgWidth: number
    svgHeight: number
    baselineY: number
  } | null>(null)

  const id = useRef(`fono-logo-${Math.random().toString(36).slice(2, 8)}`).current

  useEffect(() => {
    const measure = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const fontStr = `800 ${size}px "Plus Jakarta Sans", system-ui, sans-serif`
      ctx.font = fontStr

      const fonWidth = ctx.measureText('fon').width
      const oWidth = ctx.measureText('o').width
      const fonoWidth = ctx.measureText('fono').width
      const gap = fonoWidth - fonWidth - oWidth
      const radius = oWidth * 0.48
      const cx = fonWidth + gap + radius
      const cy = size * 0.52
      const strokeWidth = size * 0.055
      const dotR = size * 0.055
      const svgWidth = cx + radius + 2
      const svgHeight = size * 1.05
      const baselineY = size * 0.82

      setMeasurements({
        fonWidth,
        oWidth,
        fonoWidth,
        gap,
        radius,
        cx,
        cy,
        strokeWidth,
        dotR,
        svgWidth,
        svgHeight,
        baselineY,
      })
    }

    if (typeof document !== 'undefined') {
      document.fonts.ready.then(measure)
    }
  }, [size])

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} width={300} height={100} />
      {measurements ? (
        <svg
          width={measurements.svgWidth}
          height={measurements.svgHeight}
          viewBox={`0 0 ${measurements.svgWidth} ${measurements.svgHeight}`}
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Fono"
        >
          {animated && (
            <defs>
              <style>{`
                @keyframes ${id}-breathe {
                  0%, 100% { opacity: 0.3; }
                  50% { opacity: 0.55; }
                }
                @keyframes ${id}-pulse1 {
                  0% { r: ${measurements.dotR}; opacity: 0.55; }
                  100% { r: ${measurements.radius}; opacity: 0; }
                }
                @keyframes ${id}-pulse2 {
                  0% { r: ${measurements.dotR}; opacity: 0.4; }
                  100% { r: ${measurements.radius}; opacity: 0; }
                }
                @keyframes ${id}-pulse3 {
                  0% { r: ${measurements.dotR}; opacity: 0.25; }
                  100% { r: ${measurements.radius}; opacity: 0; }
                }
                .${id}-ring {
                  animation: ${id}-breathe 2.2s ease-in-out infinite;
                }
                .${id}-p1 {
                  animation: ${id}-pulse1 2.2s ease-out infinite;
                }
                .${id}-p2 {
                  animation: ${id}-pulse2 2.2s ease-out infinite;
                  animation-delay: 0.7s;
                }
                .${id}-p3 {
                  animation: ${id}-pulse3 2.2s ease-out infinite;
                  animation-delay: 1.4s;
                }
              `}</style>
            </defs>
          )}
          <text
            x="0"
            y={measurements.baselineY}
            fontFamily='"Plus Jakarta Sans", system-ui, sans-serif'
            fontWeight="800"
            fontSize={size}
            fill={textColor}
          >
            fon
          </text>
          {/* Outer ring */}
          <circle
            className={animated ? `${id}-ring` : undefined}
            cx={measurements.cx}
            cy={measurements.cy}
            r={measurements.radius}
            fill="none"
            stroke={circleColor}
            strokeWidth={measurements.strokeWidth}
            opacity={animated ? undefined : 0.5}
          />
          {/* Pulse circles */}
          {animated && (
            <>
              <circle
                className={`${id}-p1`}
                cx={measurements.cx}
                cy={measurements.cy}
                r={measurements.dotR}
                fill={pulseColor}
                opacity="0"
              />
              <circle
                className={`${id}-p2`}
                cx={measurements.cx}
                cy={measurements.cy}
                r={measurements.dotR}
                fill={pulseColor}
                opacity="0"
              />
              <circle
                className={`${id}-p3`}
                cx={measurements.cx}
                cy={measurements.cy}
                r={measurements.dotR}
                fill={pulseColor}
                opacity="0"
              />
            </>
          )}
        </svg>
      ) : (
        <span
          style={{
            fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
            fontWeight: 800,
            fontSize: size,
            color: textColor,
            lineHeight: 1,
          }}
        >
          fono
        </span>
      )}
    </>
  )
}
