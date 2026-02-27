'use client';

import { useRef } from 'react';

interface PulsingCircleProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
}

export function PulsingCircle({
  size = 28,
  color = '#E0602A',
  strokeWidth = 2.5,
  className = '',
}: PulsingCircleProps) {
  const r = size / 2 - strokeWidth;
  const dotR = size * 0.09;
  const idRef = useRef(`pc-${Math.random().toString(36).slice(2, 8)}`);
  const id = idRef.current;

  return (
    <>
      <style>{`
        #${id} .pc-ring { animation: ${id}-breath 2.2s ease-in-out infinite; }
        #${id} .pc-p1 { animation: ${id}-pulse 2.2s ease-out infinite; }
        #${id} .pc-p2 { animation: ${id}-pulse 2.2s ease-out infinite 0.7s; }
        #${id} .pc-p3 { animation: ${id}-pulse 2.2s ease-out infinite 1.4s; }
        @keyframes ${id}-breath { 0%, 100% { opacity: 0.55; } 50% { opacity: 0.3; } }
        @keyframes ${id}-pulse { 0% { r: ${dotR}; opacity: 0.55; } 100% { r: ${r}; opacity: 0; } }
      `}</style>
      <svg id={id} className={className} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="pc-ring" cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={dotR} fill={color} />
        <circle className="pc-p1" cx={size/2} cy={size/2} r={dotR} fill={color} />
        <circle className="pc-p2" cx={size/2} cy={size/2} r={dotR} fill={color} />
        <circle className="pc-p3" cx={size/2} cy={size/2} r={dotR} fill={color} />
      </svg>
    </>
  );
}
