import { useMemo, useState } from 'react'
import { cn } from '@/utils/cn'

type AggFn = 'sum' | 'avg' | 'count' | 'min' | 'max'

const COUNT_KEY = '__count__'

interface PivotTableProps {
  data: Record<string, unknown>[]
  columns: { name: string; type: string }[]
}

function aggregate(values: number[], fn: AggFn): number {
  if (!values.length) return 0
  switch (fn) {
    case 'sum':   return values.reduce((a, b) => a + b, 0)
    case 'avg':   return values.reduce((a, b) => a + b, 0) / values.length
    case 'count': return values.length
    case 'min':   return Math.min(...values)
    case 'max':   return Math.max(...values)
  }
}

function fmt(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString()
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

export function PivotTable({ data, columns }: PivotTableProps) {
  const textCols = columns.filter(c => c.type === 'text' || c.type === 'datetime')
  const numCols  = columns.filter(c => c.type === 'number' || c.type === 'currency')

  const [rowField,   setRowField]   = useState(textCols[0]?.name ?? '')
  const [colField,   setColField]   = useState(textCols[1]?.name ?? '')
  const [valueField, setValueField] = useState(numCols[0]?.name ?? COUNT_KEY)
  const [aggFn,      setAggFn]      = useState<AggFn>('sum')

  const isCountMode = valueField === COUNT_KEY

  const { rowVals, colVals, cells, rowTotals, grandTotal } = useMemo(() => {
    if (!rowField) return { rowVals: [], colVals: [], cells: {}, rowTotals: {}, grandTotal: 0 }

    const rowSet = new Set<string>()
    const colSet = new Set<string>()
    const groups: Record<string, Record<string, number[]>> = {}

    for (const row of data) {
      const rv = String(row[rowField] ?? '(blank)')
      const cv = colField ? String(row[colField] ?? '(blank)') : '__all__'

      rowSet.add(rv)
      colSet.add(cv)
      groups[rv] ??= {}
      groups[rv][cv] ??= []

      if (isCountMode) {
        groups[rv][cv].push(1)
      } else {
        const val = parseFloat(String(row[valueField] ?? 0))
        if (!isNaN(val)) groups[rv][cv].push(val)
      }
    }

    const rowVals = [...rowSet].sort()
    const colVals = colField ? [...colSet].sort() : ['Count']
    const cells: Record<string, Record<string, number>> = {}
    const rowTotals: Record<string, number> = {}
    let grandTotal = 0

    for (const rv of rowVals) {
      cells[rv] = {}
      let rowTotal = 0
      for (const cv of colVals) {
        const key = colField ? cv : '__all__'
        const vals = groups[rv]?.[key] ?? []
        const agg = isCountMode ? vals.length : aggregate(vals, aggFn)
        cells[rv][cv] = agg
        rowTotal += agg
      }
      rowTotals[rv] = rowTotal
      grandTotal += rowTotal
    }

    return { rowVals, colVals, cells, rowTotals, grandTotal }
  }, [data, rowField, colField, valueField, aggFn, isCountMode])

  const selectClass = "bg-surface-elevated border border-[--color-border] rounded-[--radius-md] px-2 py-1 text-xs text-[--color-text-primary] outline-none focus:border-brand-primary"

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 p-4 bg-surface-elevated rounded-lg border border-[--color-border]">
        <label className="flex items-center gap-2 text-xs text-[--color-text-secondary]">
          Rows
          <select className={selectClass} value={rowField} onChange={e => setRowField(e.target.value)}>
            {textCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-[--color-text-secondary]">
          Columns
          <select className={selectClass} value={colField} onChange={e => setColField(e.target.value)}>
            <option value="">(none)</option>
            {textCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-[--color-text-secondary]">
          Values
          <select className={selectClass} value={valueField} onChange={e => setValueField(e.target.value)}>
            <option value={COUNT_KEY}>Count rows</option>
            {numCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </label>
        {!isCountMode && (
          <label className="flex items-center gap-2 text-xs text-[--color-text-secondary]">
            Aggregate
            <select className={selectClass} value={aggFn} onChange={e => setAggFn(e.target.value as AggFn)}>
              {(['sum', 'avg', 'count', 'min', 'max'] as AggFn[]).map(f => (
                <option key={f} value={f}>{f.toUpperCase()}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Pivot grid */}
      {rowVals.length === 0 ? (
        <p className="text-sm text-[--color-text-tertiary] text-center py-8">
          {textCols.length === 0
            ? 'No text or date columns found to use as row/column fields.'
            : 'No data to pivot.'}
        </p>
      ) : (
        <div className="overflow-auto rounded-lg border border-[--color-border]">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr className="bg-surface-elevated border-b border-[--color-border]">
                <th className="px-4 py-2.5 text-left font-semibold text-[--color-text-secondary] sticky left-0 bg-surface-elevated">{rowField}</th>
                {colVals.map(cv => (
                  <th key={cv} className="px-4 py-2.5 text-right font-semibold text-[--color-text-secondary] whitespace-nowrap">{cv}</th>
                ))}
                <th className="px-4 py-2.5 text-right font-semibold text-brand-primary whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {rowVals.map((rv, ri) => (
                <tr key={rv} className={cn('border-b border-[--color-border-subtle]', ri % 2 === 0 ? 'bg-surface-base' : 'bg-surface-card', 'hover:bg-surface-hover')}>
                  <td className="px-4 py-2 font-medium text-[--color-text-primary] sticky left-0 bg-inherit">{rv}</td>
                  {colVals.map(cv => (
                    <td key={cv} className="px-4 py-2 text-right font-mono text-[--color-text-primary]">
                      {fmt(cells[rv]?.[cv] ?? 0)}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-mono font-semibold text-brand-primary">
                    {fmt(rowTotals[rv] ?? 0)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-brand-primary/30 bg-surface-elevated font-semibold">
                <td className="px-4 py-2.5 text-[--color-text-secondary] sticky left-0 bg-surface-elevated">Grand Total</td>
                {colVals.map(cv => {
                  const colTotal = rowVals.reduce((s, rv) => s + (cells[rv]?.[cv] ?? 0), 0)
                  return <td key={cv} className="px-4 py-2.5 text-right font-mono text-[--color-text-primary]">{fmt(colTotal)}</td>
                })}
                <td className="px-4 py-2.5 text-right font-mono text-brand-primary">{fmt(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
