import { cn } from '@/utils/cn'

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={cn('animate-pulse rounded-[--radius-md] bg-surface-elevated', className)} />
  )
}
