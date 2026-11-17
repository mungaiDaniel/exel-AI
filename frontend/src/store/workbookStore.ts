import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WorkbookStore {
  currentWorkbookId: string | null
  currentSheetIndex: number
  selectedColumns: string[]
  setWorkbook: (id: string) => void
  setSheet: (index: number) => void
  toggleColumn: (col: string) => void
  clearSelection: () => void
}

export const useWorkbookStore = create<WorkbookStore>()(
  persist(
    (set, get) => ({
      currentWorkbookId: null,
      currentSheetIndex: 0,
      selectedColumns: [],
      setWorkbook: (id) => set({ currentWorkbookId: id, currentSheetIndex: 0, selectedColumns: [] }),
      setSheet: (index) => set({ currentSheetIndex: index }),
      toggleColumn: (col) => {
        const cols = get().selectedColumns
        set({ selectedColumns: cols.includes(col) ? cols.filter(c => c !== col) : [...cols, col] })
      },
      clearSelection: () => set({ selectedColumns: [] }),
    }),
    { name: 'workbook-store' },
  ),
)
