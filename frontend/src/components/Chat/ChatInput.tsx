import { useState } from 'react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message..." 
}: ChatInputProps) {
  const [inputText, setInputText] = useState('')

  const handleSend = () => {
    if (!inputText.trim() || disabled) return
    
    onSendMessage(inputText.trim())
    setInputText('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t p-4 bg-gray-50">
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            className="w-full min-h-[44px] max-h-32 border border-gray-300 rounded-lg px-3 py-2 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={disabled}
            rows={1}
            style={{
              height: 'auto',
              minHeight: '44px'
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = 'auto'
              target.style.height = Math.min(target.scrollHeight, 128) + 'px'
            }}
          />
          
          {/* Character count indicator */}
          {inputText.length > 0 && (
            <div className="absolute bottom-1 right-2 text-xs text-gray-400">
              {inputText.length}/2000
            </div>
          )}
        </div>
        
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || disabled}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-w-[80px]"
          aria-label="Send message"
        >
          {disabled ? (
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            'Send'
          )}
        </button>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  )
}