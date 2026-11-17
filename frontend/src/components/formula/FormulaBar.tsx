import { useState } from 'react'
import { Play, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils/cn'

interface FormulaBarProps {
  onEvaluate: (expr: string) => void
  onExplain: (expr: string) => void
  loading?: boolean
}

export function FormulaBar({ onEvaluate, onExplain, loading }: FormulaBarProps) {
  const [value, setValue] = useState('')

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim()) onEvaluate(value.trim())
    }
  }

  return (
    <div className="flex items-center gap-2 bg-surface-elevated border border-[--color-border] rounded-lg p-2">
      <span className="text-[--color-text-tertiary] font-mono text-sm px-2">fx</span>
      <input
        className="flex-1 bg-transparent font-mono text-sm text-[--color-text-primary] outline-none placeholder:text-[--color-text-tertiary]"
        placeholder="=SUM(A1:A10) or =VLOOKUP(..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
      />
      <Button size="sm" onClick={() => value.trim() && onEvaluate(value.trim())} loading={loading}>
        <Play className="w-3 h-3" />
        Run
      </Button>
      <Button size="sm" variant="secondary" onClick={() => value.trim() && onExplain(value.trim())} disabled={loading}>
        <HelpCircle className="w-3 h-3" />
        Explain
      </Button>
    </div>
  )
}
