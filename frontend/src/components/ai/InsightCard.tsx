import { Sparkles } from 'lucide-react'

interface InsightCardProps {
  insights: string[]
  workbookName?: string
}

export function InsightCard({ insights, workbookName }: InsightCardProps) {
  if (!insights.length) return null

  return (
    <div className="rounded-xl border border-brand-purple/30 bg-brand-purple/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand-purple" />
        <p className="text-sm font-semibold text-brand-purple">
          AI Insights{workbookName ? ` — ${workbookName}` : ''}
        </p>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className="flex gap-2 text-sm text-[--color-text-secondary] leading-relaxed">
            <span className="shrink-0 w-5 h-5 rounded-full bg-brand-purple/20 text-brand-purple text-xs flex items-center justify-center font-semibold mt-0.5">
              {i + 1}
            </span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  )
}
