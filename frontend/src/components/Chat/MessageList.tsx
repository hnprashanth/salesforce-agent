import { type RefObject } from 'react'
import type { ChatMessage } from '@/types'
import Message from './Message'
import TypingIndicator from './TypingIndicator'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  onActionClick: (action: string, payload?: Record<string, unknown>) => void
  messagesEndRef: RefObject<HTMLDivElement | null>
}

export default function MessageList({ 
  messages, 
  isLoading, 
  onActionClick, 
  messagesEndRef 
}: MessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          onActionClick={onActionClick}
        />
      ))}
      
      {isLoading && <TypingIndicator />}
      
      <div ref={messagesEndRef} />
    </div>
  )
}