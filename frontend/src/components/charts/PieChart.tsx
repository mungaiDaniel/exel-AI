import {
  PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { chartColors } from '@/utils/colorUtils'

interface PieChartProps {
  data: Record<string, unknown>[]
  nameKey: string
  valueKey: string
}

export function PieChart({ data, nameKey, valueKey }: PieChartProps) {
  const colors = chartColors(data.length)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RePieChart>
        <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius="70%" paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
          itemStyle={{ color: 'var(--color-text-primary)' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--color-text-tertiary)' }} />
      </RePieChart>
    </ResponsiveContainer>
  )
}
