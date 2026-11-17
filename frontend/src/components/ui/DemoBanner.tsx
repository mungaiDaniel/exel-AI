import { Info } from 'lucide-react'
import { DEMO_MODE } from '@/demo/config'

/** Persistent, non-blocking notice shown only when the app runs on mock data. */
export function DemoBanner() {
  if (!DEMO_MODE) return null
  return (
    <div
      role="status"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full border border-[--color-border] bg-surface-elevated px-4 py-1.5 text-xs text-[--color-text-secondary] shadow-lg"
    >
      <Info className="w-3.5 h-3.5 text-brand-primary shrink-0" />
      <span>Demo mode — sample data, changes are not saved.</span>
    </div>
  )
}
