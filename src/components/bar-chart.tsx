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
    backgroundColor: '#1E0E00',
    border: 'none',
    borderRadius: '8px',
    color: '#FDF0E8',
    fontSize: '13px',
  },
  labelStyle: { color: '#FDF0E8', fontWeight: 600 },
  cursor: { fill: 'rgba(224, 96, 42, 0.05)' },
}

export function BarChart({ data }: BarChartProps) {
  const hasData = data.some((d) => d.answered + d.missed + d.recovered > 0)

  if (data.length === 0 || !hasData) {
    return (
      <div className="flex items-center justify-center h-[160px] md:h-[200px] text-brown text-sm">
        No calls today
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RechartsBarChart data={data} barGap={0} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#8B7355' }}
          tickLine={false}
          axisLine={{ stroke: '#f0e0d0' }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#8B7355' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
          width={28}
        />
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
      <div className="flex items-center justify-center h-[200px] text-brown text-sm">
        No calls today
      </div>
    )
  }

  const height = Math.max(200, withData.length * 36)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={withData} layout="vertical" barGap={0} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d0" horizontal={false} />
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
          axisLine={{ stroke: '#f0e0d0' }}
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
