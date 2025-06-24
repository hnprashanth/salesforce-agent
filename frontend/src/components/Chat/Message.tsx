import type { ChatMessage } from '@/types'
import ActionButton from './ActionButton'

interface MessageProps {
  message: ChatMessage
  onActionClick: (action: string, payload?: any) => void
}

export default function Message({ message, onActionClick }: MessageProps) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[70%] sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        <div
          className={`inline-block rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
          <div className={`text-xs mt-1 ${
            isUser ? 'text-blue-100' : 'text-gray-500'
          }`}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
        
        {/* Action buttons for AI responses */}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.actions.map((action) => (
              <ActionButton
                key={action.id}
                action={action}
                onClick={() => onActionClick(action.action, action.payload)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}