import { apiService } from './ApiService'
import type { ApiResponse, ChatMessage } from '@/types'

export interface ChatRequest {
  message: string
  opportunityId?: string
  sessionId?: string
}

export interface ChatResponse {
  reply: string
  actions?: Array<{
    id: string
    label: string
    action: string
    payload?: any
  }>
}

export class ChatService {
  async sendMessage(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    return apiService.post<ChatResponse>('/chat', request)
  }

  async getChatHistory(sessionId: string): Promise<ApiResponse<ChatMessage[]>> {
    return apiService.get<ChatMessage[]>(`/chat/history/${sessionId}`)
  }

  async clearChatHistory(sessionId: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/chat/history/${sessionId}`)
  }
}

export const chatService = new ChatService()