import {
  LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { chartColor } from '@/utils/colorUtils'

interface LineChartProps {
  data: Record<string, unknown>[]
  xKey: string
  yKey: string
  color?: string
}

export function LineChart({ data, xKey, yKey, color }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ReLineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: 'var(--color-text-secondary)' }}
          itemStyle={{ color: 'var(--color-text-primary)' }}
        />
        <Line type="monotone" dataKey={yKey} stroke={color ?? chartColor(0)} strokeWidth={2} dot={false} />
      </ReLineChart>
    </ResponsiveContainer>
  )
}
