'use client';

import { useEffect, useRef, useState } from 'react';

interface FonoLogoProps {
  size?: number;
  textColor?: string;
  circleColor?: string;
  pulseColor?: string;
  animated?: boolean;
  className?: string;
}

export function FonoLogo({
  size = 48,
  textColor = '#E0602A',
  circleColor = '#E0602A',
  pulseColor = '#E0602A',
  animated = true,
  className = '',
}: FonoLogoProps) {
  const [dims, setDims] = useState<{
    fonWidth: number;
    oWidth: number;
    fonoWidth: number;
  } | null>(null);
  const idRef = useRef(`logo-${Math.random().toString(36).slice(2, 8)}`);
  const id = idRef.current;

  useEffect(() => {
    document.fonts.ready.then(() => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.font = `800 ${size}px 'Plus Jakarta Sans'`;
      const fonWidth = ctx.measureText('fon').width;
      const oWidth = ctx.measureText('o').width;
      const fonoWidth = ctx.measureText('fono').width;
      setDims({ fonWidth, oWidth, fonoWidth });
    });
  }, [size]);

  if (!dims) {
    return (
      <span
        className={className}
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          fontSize: size,
          color: textColor,
          letterSpacing: '-0.02em',
        }}
      >
        fono
      </span>
    );
  }

  const naturalGap = dims.fonoWidth - dims.fonWidth - dims.oWidth;
  const circleR = dims.oWidth * 0.48;
  const circleCx = dims.fonWidth + Math.max(naturalGap, size * 0.02) + circleR;
  const circleCy = size * 0.52;
  const totalW = circleCx + circleR + 2;
  const totalH = size * 1.05;
  const baseline = size * 0.82;
  const strokeW = Math.max(size * 0.055, 2);
  const dotR = Math.max(size * 0.055, 2);

  return (
    <>
      {animated && (
        <style>{`
          #${id} .fono-ring { animation: ${id}_ring 2.2s ease-in-out infinite; }
          #${id} .fono-p1 { animation: ${id}_p1 2.2s ease-out infinite; }
          #${id} .fono-p2 { animation: ${id}_p2 2.2s ease-out infinite 0.7s; }
          #${id} .fono-p3 { animation: ${id}_p3 2.2s ease-out infinite 1.4s; }
          @keyframes ${id}_ring { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.3; } }
          @keyframes ${id}_p1 { 0% { r: ${dotR}; opacity: 0.55; } 100% { r: ${circleR}; opacity: 0; } }
          @keyframes ${id}_p2 { 0% { r: ${dotR}; opacity: 0.4; } 100% { r: ${circleR}; opacity: 0; } }
          @keyframes ${id}_p3 { 0% { r: ${dotR}; opacity: 0.25; } 100% { r: ${circleR}; opacity: 0; } }
        `}</style>
      )}
      <svg
        id={id}
        className={className}
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${totalW} ${totalH}`}
      >
        <text
          x="0"
          y={baseline}
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="800"
          fontSize={size}
          fill={textColor}
        >
          fon
        </text>
        <circle
          className="fono-ring"
          cx={circleCx}
          cy={circleCy}
          r={circleR}
          fill="none"
          stroke={circleColor}
          strokeWidth={strokeW}
        />
        <circle className="fono-p1" cx={circleCx} cy={circleCy} r={dotR} fill={pulseColor} />
        <circle className="fono-p2" cx={circleCx} cy={circleCy} r={dotR} fill={pulseColor} />
        <circle className="fono-p3" cx={circleCx} cy={circleCy} r={dotR} fill={pulseColor} />
      </svg>
    </>
  );
}
