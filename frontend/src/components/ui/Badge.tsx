import { cn } from '@/utils/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-surface-elevated text-[--color-text-secondary]',
  success: 'bg-emerald-900/50 text-emerald-400',
  warning: 'bg-amber-900/50 text-amber-400',
  error:   'bg-red-900/50 text-red-400',
  info:    'bg-blue-900/50 text-blue-400',
  purple:  'bg-purple-900/50 text-purple-400',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variantClasses[variant], className)}>
      {children}
    </span>
  )
}
