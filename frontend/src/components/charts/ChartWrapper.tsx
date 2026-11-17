import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

interface ChartWrapperProps {
  title?: string
  loading?: boolean
  children: React.ReactNode
  height?: number
}

export function ChartWrapper({ title, loading, children, height = 280 }: ChartWrapperProps) {
  return (
    <Card className="flex flex-col gap-4">
      {title && (
        <h3 className="text-sm font-semibold text-[--color-text-primary]">{title}</h3>
      )}
      {loading ? (
        <Skeleton style={{ height }} />
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </Card>
  )
}
