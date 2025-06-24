import { useState, useRef, useEffect } from 'react'
import { chatService } from '@/services'
import type { ChatMessage } from '@/types'
import MessageList from './MessageList'
import ChatInput from './ChatInput'

interface ChatContainerProps {
  className?: string
}

const initialMessages: ChatMessage[] = [
  {
    id: '1',
    content: 'Hello! I\'m your Salesforce AI Assistant. I can help you with opportunity analysis, deal strategy, and account insights. What would you like to know?',
    role: 'assistant',
    timestamp: new Date()
  }
]

export default function ChatContainer({ className = '' }: ChatContainerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [sessionId] = useState(() => crypto.randomUUID())

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: messageText,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    try {
      const response = await chatService.sendMessage({
        message: messageText,
        sessionId
      })

      if (response.success && response.data) {
        const aiResponse: ChatMessage = {
          id: crypto.randomUUID(),
          content: response.data.response,
          role: 'assistant',
          timestamp: new Date(),
          actions: response.data.suggestedActions?.map(action => ({
            id: crypto.randomUUID(),
            label: action.suggestion,
            action: action.type,
            payload: { confidence: action.confidence }
          }))
        }
        setMessages(prev => [...prev, aiResponse])
      } else {
        throw new Error(response.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
      
      const errorResponse: ChatMessage = {
        id: crypto.randomUUID(),
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleActionClick = (action: string, payload?: any) => {
    // Handle action button clicks
    console.log('Action clicked:', action, payload)
    // TODO: Implement specific action handlers
  }

  return (
    <div className={`flex flex-col h-[600px] bg-white rounded-lg shadow ${className}`}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 text-sm">
          <strong>Error:</strong> {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      
      <MessageList 
        messages={messages}
        isLoading={isLoading}
        onActionClick={handleActionClick}
        messagesEndRef={messagesEndRef}
      />
      
      <ChatInput 
        onSendMessage={handleSendMessage}
        disabled={isLoading}
        placeholder="Ask about your opportunities, deals, or account strategy..."
      />
    </div>
  )
}