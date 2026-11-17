import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, FileSpreadsheet, Layers, X, Rows3 } from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { Badge } from '@/components/ui/Badge'
import { searchApi, type SearchResult } from '@/api/search.api'
import { cn } from '@/utils/cn'

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export default function Search() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 350)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (!debouncedQuery.trim()) { setResult(null); return }
    setLoading(true)
    searchApi.search(debouncedQuery)
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  const hasResults = result && (result.total > 0 || (result.data_hits?.length ?? 0) > 0)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-display font-bold text-[--color-text-primary]">Search</h1>

      {/* Search bar */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[--color-text-tertiary]" />
        <input
          ref={inputRef}
          className="w-full bg-surface-card border border-[--color-border] rounded-xl pl-12 pr-10 py-3.5 text-sm text-[--color-text-primary] placeholder:text-[--color-text-tertiary] outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
          placeholder="Search workbooks, sheets, columns…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-hover text-[--color-text-tertiary]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
        </div>
      )}

      {!loading && result && (
        <div className="space-y-6">
          {result.workbooks.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-[--color-text-tertiary] uppercase tracking-wider mb-3">Workbooks</p>
              <div className="space-y-2">
                {result.workbooks.map(w => (
                  <button
                    key={w.id}
                    onClick={() => navigate(`/workbooks/${w.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-[--color-border] bg-surface-card hover:border-brand-primary/50 hover:bg-surface-hover transition-all text-left"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-brand-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[--color-text-primary] truncate">{w.name}</p>
                      <p className="text-xs text-[--color-text-tertiary]">{w.sheet_count} sheets · {w.row_count.toLocaleString()} rows</p>
                    </div>
                    <Badge variant="info">workbook</Badge>
                  </button>
                ))}
              </div>
            </section>
          )}

          {result.sheets.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-[--color-text-tertiary] uppercase tracking-wider mb-3">Sheets</p>
              <div className="space-y-2">
                {result.sheets.map(s => (
                  <button
                    key={s.id}
                    onClick={() => navigate(`/workbooks/${s.workbook_id}/sheets/${s.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-[--color-border] bg-surface-card hover:border-brand-secondary/50 hover:bg-surface-hover transition-all text-left"
                  >
                    <Layers className="w-5 h-5 text-brand-secondary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[--color-text-primary] truncate">{s.name}</p>
                      {s.matching_columns.length > 0 && (
                        <p className="text-xs text-[--color-text-tertiary] truncate">
                          Columns: {s.matching_columns.join(', ')}
                        </p>
                      )}
                    </div>
                    <Badge variant="success">{s.match}</Badge>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Data row hits */}
          {result.data_hits && result.data_hits.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-[--color-text-tertiary] uppercase tracking-wider mb-3">Data Rows</p>
              <div className="space-y-2">
                {result.data_hits.map(hit => (
                  <button
                    key={hit.sheet_id}
                    onClick={() => navigate(`/workbooks/${hit.workbook_id}/sheets/${hit.sheet_id}`)}
                    className="w-full text-left p-3 rounded-lg border border-[--color-border] bg-surface-card hover:border-brand-accent/50 hover:bg-surface-hover transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Rows3 className="w-5 h-5 text-brand-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[--color-text-primary] truncate">{hit.sheet_name}</p>
                        <p className="text-xs text-[--color-text-tertiary]">{hit.match_count.toLocaleString()} matching rows</p>
                      </div>
                      <Badge variant="warning">data</Badge>
                    </div>
                    {/* Sample matching cells */}
                    {hit.sample_rows.slice(0, 2).map((row, i) => (
                      <div key={i} className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(row).slice(0, 4).map(([col, val]) => (
                          <span key={col} className="text-[10px] px-2 py-0.5 rounded bg-brand-accent/10 text-brand-accent">
                            <span className="text-[--color-text-tertiary]">{col}: </span>
                            {String(val).slice(0, 40)}
                          </span>
                        ))}
                      </div>
                    ))}
                  </button>
                ))}
              </div>
            </section>
          )}

          {!hasResults && (
            <div className="text-center py-10">
              <SearchIcon className="mx-auto w-8 h-8 text-[--color-text-tertiary] mb-3" />
              <p className="text-[--color-text-secondary]">No results for "{query}"</p>
              <p className="text-xs text-[--color-text-tertiary] mt-1">Try searching for a column name, sheet name, or workbook</p>
            </div>
          )}
        </div>
      )}

      {!query && !loading && (
        <div className="text-center py-16">
          <SearchIcon className="mx-auto w-10 h-10 text-[--color-text-tertiary] mb-4" />
          <p className="text-[--color-text-secondary]">Start typing to search across all your workbooks</p>
        </div>
      )}
    </div>
  )
}
