import {
  useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel,
  flexRender, type ColumnDef, type SortingState,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Input } from '@/components/ui/Input'

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  searchable?: boolean
}

export function DataTable<T>({ data, columns, searchable }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="space-y-3">
      {searchable && (
        <Input
          placeholder="Filter rows..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-xs"
        />
      )}
      <div className="overflow-auto rounded-lg border border-[--color-border]">
        <table className="w-full text-sm border-collapse">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="border-b border-[--color-border] bg-surface-elevated">
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className={cn(
                      'px-4 py-3 text-left font-semibold text-[--color-text-secondary] text-xs uppercase tracking-wider whitespace-nowrap',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:text-[--color-text-primary]',
                    )}
                  >
                    <span className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <ArrowUp className="w-3 h-3" />}
                      {header.column.getIsSorted() === 'desc' && <ArrowDown className="w-3 h-3" />}
                      {header.column.getCanSort() && !header.column.getIsSorted() && <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </span>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, idx) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-[--color-border-subtle] transition-colors',
                  idx % 2 === 0 ? 'bg-surface-base' : 'bg-surface-card',
                  'hover:bg-surface-hover',
                )}
              >
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2.5 text-[--color-text-primary] font-mono text-xs whitespace-nowrap max-w-[200px] truncate">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 && (
          <div className="text-center py-12 text-[--color-text-tertiary]">No rows found</div>
        )}
      </div>
      <p className="text-xs text-[--color-text-tertiary]">
        {table.getFilteredRowModel().rows.length} of {data.length} rows
      </p>
    </div>
  )
}
