import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { anomaliesApi, type AnomalyResult, type Anomaly } from '@/api/anomalies.api'

interface AnomalyPanelProps {
  sheetId: string
}

function AnomalyRow({ a }: { a: Anomaly }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-base border border-[--color-border-subtle]">
      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.severity === 'high' ? 'text-red-400' : 'text-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[--color-text-primary]">{a.column}</span>
          <Badge variant={a.severity === 'high' ? 'error' : 'warning'}>
            z={a.z_score}
          </Badge>
          <Badge variant="default">Row {a.row_index + 2}</Badge>
        </div>
        <p className="text-xs text-[--color-text-tertiary] mt-0.5">
          Value <span className="font-mono text-[--color-text-secondary]">{a.value.toLocaleString()}</span>
          {' '}vs mean <span className="font-mono text-[--color-text-secondary]">{a.mean.toLocaleString()}</span>
          {' '}(σ = {a.stdev.toLocaleString()})
        </p>
      </div>
    </div>
  )
}

export function AnomalyPanel({ sheetId }: AnomalyPanelProps) {
  const [result, setResult] = useState<AnomalyResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [ran, setRan] = useState(false)

  const run = async () => {
    setLoading(true)
    setRan(true)
    try {
      const data = await anomaliesApi.get(sheetId)
      setResult(data)
      setExpanded(true)
    } catch {
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {!ran ? (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-[--color-border] bg-surface-elevated">
          <AlertTriangle className="w-5 h-5 text-brand-accent shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[--color-text-primary]">Anomaly Detection</p>
            <p className="text-xs text-[--color-text-tertiary] mt-0.5">
              AI scans numeric columns for outliers and suspicious values.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={run} loading={loading}>
            Run analysis
          </Button>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-[--color-border] text-[--color-text-secondary] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analysing for anomalies…
        </div>
      ) : result ? (
        <div className="rounded-xl border border-[--color-border] overflow-hidden">
          <button
            onClick={() => setExpanded(v => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-surface-elevated hover:bg-surface-hover transition-colors"
          >
            {result.anomaly_count === 0
              ? <ShieldCheck className="w-4 h-4 text-brand-secondary" />
              : <AlertTriangle className="w-4 h-4 text-brand-accent" />}
            <span className="text-sm font-semibold text-[--color-text-primary] flex-1 text-left">
              {result.anomaly_count === 0
                ? 'No anomalies detected'
                : `${result.anomaly_count} anomal${result.anomaly_count === 1 ? 'y' : 'ies'} detected`}
            </span>
            {expanded ? <ChevronUp className="w-4 h-4 text-[--color-text-tertiary]" /> : <ChevronDown className="w-4 h-4 text-[--color-text-tertiary]" />}
          </button>

          {expanded && (
            <div className="p-4 space-y-4">
              {result.explanation && (
                <p className="text-sm text-[--color-text-secondary] leading-relaxed border-l-2 border-brand-purple pl-3">
                  {result.explanation}
                </p>
              )}
              {result.anomalies.length > 0 && (
                <div className="space-y-2">
                  {result.anomalies.map((a, i) => <AnomalyRow key={i} a={a} />)}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
