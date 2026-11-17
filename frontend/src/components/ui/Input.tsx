import { cn } from '@/utils/cn'
import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-[--color-text-secondary]">{label}</label>
      )}
      <input
        ref={ref}
        className={cn(
          'bg-surface-elevated border border-[--color-border] rounded-[--radius-md] px-3 py-2 text-sm text-[--color-text-primary] placeholder:text-[--color-text-tertiary]',
          'focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary',
          'transition-colors duration-[--transition-fast]',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  ),
)
Input.displayName = 'Input'
