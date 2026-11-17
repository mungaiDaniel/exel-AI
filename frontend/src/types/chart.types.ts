export type ChartType = 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'heatmap'

export interface ChartSuggestion {
  chart_type: ChartType
  x: string
  y: string
  title: string
  reasoning: string
  transform?: 'missingness' | 'value_counts'
  column?: string
}

export interface ChartConfig {
  id: string
  dashboard_id: string
  sheet_id: string | null
  title: string | null
  chart_type: ChartType
  config: Record<string, unknown>
  position: { x?: number; y?: number; w?: number; h?: number }
  created_at: string
}
