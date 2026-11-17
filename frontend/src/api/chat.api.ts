import { apiClient } from './client'
import type { ChatMessage } from '@/types/ai.types'

export const chatApi = {
  send: (content: string, workbookId?: string) =>
    apiClient.post<ChatMessage>('/chat/message', { content, workbook_id: workbookId }).then(r => r.data),

  history: (workbookId: string) =>
    apiClient.get<{ messages: ChatMessage[]; workbook_id: string }>(`/chat/history/${workbookId}`).then(r => r.data),
}
