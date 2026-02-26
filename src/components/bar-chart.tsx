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

export function BarChart({ data }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-brown text-sm">
        No call data for this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data} barGap={0} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0e0d0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#8B7355' }}
          tickLine={false}
          axisLine={{ stroke: '#f0e0d0' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#8B7355' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1E0E00',
            border: 'none',
            borderRadius: '8px',
            color: '#FDF0E8',
            fontSize: '13px',
          }}
          labelStyle={{ color: '#FDF0E8', fontWeight: 600 }}
          cursor={{ fill: 'rgba(224, 96, 42, 0.05)' }}
        />
        <Bar
          dataKey="answered"
          name="Answered"
          fill="#22C55E"
          stackId="calls"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="recovered"
          name="Recovered"
          fill="#E0602A"
          stackId="calls"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="missed"
          name="Missed"
          fill="#EF4444"
          stackId="calls"
          radius={[4, 4, 0, 0]}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
