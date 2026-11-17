const CHART_COLORS = [
  '#1A56DB', '#0E9F6E', '#FF6B35', '#7C3AED',
  '#F05252', '#FBBF24', '#3B82F6', '#10B981',
]

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

export function chartColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => chartColor(i))
}
