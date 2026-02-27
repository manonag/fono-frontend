'use client'

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { ChartDataPoint } from '@/types'

interface BarChartProps {
  data: ChartDataPoint[]
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: '#fff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: '10px',
    fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  labelStyle: { color: '#1E0E00', fontWeight: 600, fontSize: 13 },
  cursor: { fill: 'rgba(224, 96, 42, 0.04)' },
}

export function BarChart({ data }: BarChartProps) {
  const hasData = data.some((d) => d.answered + d.missed + d.recovered > 0)

  if (data.length === 0 || !hasData) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: 180 }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8B7355" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        <p className="text-brown mt-2" style={{ fontSize: 14 }}>No calls yet today</p>
        <p className="text-brown" style={{ fontSize: 12, opacity: 0.6 }}>Call volume will appear here</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <RechartsBarChart data={data} barGap={0} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#8B7355' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
        />
        <YAxis hide allowDecimals={false} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="answered" name="Answered" fill="#22C55E" stackId="calls" radius={[0, 0, 0, 0]} />
        <Bar dataKey="recovered" name="Recovered" fill="#E0602A" stackId="calls" radius={[0, 0, 0, 0]} />
        <Bar dataKey="missed" name="Missed" fill="#EF4444" stackId="calls" radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

export function HorizontalBarChart({ data }: BarChartProps) {
  const withData = data.filter((d) => d.answered + d.missed + d.recovered > 0)

  if (withData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: 200 }}>
        <p className="text-brown" style={{ fontSize: 14 }}>No calls yet today</p>
      </div>
    )
  }

  const height = Math.max(200, withData.length * 36)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={withData} layout="vertical" barGap={0} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
        <YAxis
          dataKey="label"
          type="category"
          tick={{ fontSize: 11, fill: '#8B7355' }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#8B7355' }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(0,0,0,0.06)' }}
          allowDecimals={false}
        />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey="answered" name="Answered" fill="#22C55E" stackId="calls" radius={[0, 0, 0, 0]} />
        <Bar dataKey="recovered" name="Recovered" fill="#E0602A" stackId="calls" radius={[0, 0, 0, 0]} />
        <Bar dataKey="missed" name="Missed" fill="#EF4444" stackId="calls" radius={[0, 4, 4, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
