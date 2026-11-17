import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { FlaskConical } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { FormulaBar } from '@/components/formula/FormulaBar'
import { formulasApi } from '@/api/formulas.api'

interface Result {
  expression: string
  success: boolean
  result?: unknown
  error?: string
  explanation?: string
}

export default function FormulaLab() {
  const [loading, setLoading] = useState(false)
  const [explaining, setExplaining] = useState(false)
  const [history, setHistory] = useState<Result[]>([])

  const handleEvaluate = async (expr: string) => {
    setLoading(true)
    try {
      const res = await formulasApi.evaluate(expr)
      setHistory(h => [{ expression: expr, ...res }, ...h])
    } catch {
      toast.error('Evaluation failed')
    } finally {
      setLoading(false)
    }
  }

  const handleExplain = async (expr: string) => {
    setExplaining(true)
    try {
      const res = await formulasApi.explain(expr)
      setHistory(h => [{ expression: expr, success: true, explanation: res.explanation }, ...h])
    } catch {
      toast.error('Explanation failed')
    } finally {
      setExplaining(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <FlaskConical className="w-6 h-6 text-brand-secondary" />
        <h1 className="text-2xl font-display font-bold text-[--color-text-primary]">Formula Lab</h1>
      </div>

      <Card>
        <p className="text-sm text-[--color-text-secondary] mb-4">
          Type an Excel formula, press <kbd className="bg-surface-elevated px-1 rounded text-xs">Enter</kbd> to evaluate or click Explain for an AI breakdown.
        </p>
        <FormulaBar onEvaluate={handleEvaluate} onExplain={handleExplain} loading={loading || explaining} />
      </Card>

      {(loading || explaining) && <Skeleton className="h-24" />}

      {history.map((r, i) => (
        <Card key={i}>
          <code className="font-mono text-sm text-brand-primary">{r.expression}</code>
          {r.explanation ? (
            <p className="text-sm text-[--color-text-secondary] mt-3">{r.explanation}</p>
          ) : (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant={r.success ? 'success' : 'error'}>{r.success ? 'Result' : 'Error'}</Badge>
              <span className="font-mono text-sm text-[--color-text-primary]">
                {r.success ? String(r.result) : r.error}
              </span>
            </div>
          )}
        </Card>
      ))}

      {history.length === 0 && !loading && (
        <Card className="text-center py-10">
          <p className="text-[--color-text-tertiary] text-sm">
            Try: <code className="font-mono">{'=SUM(100, 200, 300)'}</code> or <code className="font-mono">{'=IF(5>3, "yes", "no")'}</code>
          </p>
        </Card>
      )}
    </div>
  )
}
