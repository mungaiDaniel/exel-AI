export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata_: Record<string, unknown>
  created_at: string
}

export interface ChatHistory {
  messages: ChatMessage[]
  workbook_id: string | null
}
