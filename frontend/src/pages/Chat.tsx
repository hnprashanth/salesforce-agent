import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '@/types'

const initialMessages: ChatMessage[] = [
  {
    id: '1',
    content: 'Hello! I\'m your Salesforce AI Assistant. I can help you with opportunity analysis, deal strategy, and account insights. What would you like to know?',
    role: 'assistant',
    timestamp: new Date()
  }
]

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputText,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: getAIResponse(inputText),
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiResponse])
      setIsLoading(false)
    }, 1500)
  }

  const getAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase()
    
    if (input.includes('opportunity') || input.includes('deal')) {
      return 'I can see you have 3 active opportunities totaling $800K. The "Digital Transformation Project" with Financial Services Ltd looks most promising at 75% probability. Would you like me to analyze the competitive landscape or suggest next steps for any specific deal?'
    }
    
    if (input.includes('techcorp') || input.includes('enterprise software')) {
      return 'The TechCorp Enterprise Software Implementation is at 60% probability with $250K value. Based on similar deals, I recommend scheduling an executive briefing to address their scalability concerns. Historical data shows deals like this close 23% faster with C-level engagement.'
    }
    
    if (input.includes('financial services') || input.includes('digital transformation')) {
      return 'Great news! The Financial Services Ltd deal is progressing well at 75% probability. They\'re in final negotiations. I suggest preparing a competitive differentiator document highlighting our 15% cost advantage over CompetitorX, as mentioned in our win/loss analysis.'
    }
    
    if (input.includes('strategy') || input.includes('help') || input.includes('advice')) {
      return 'I can help with deal strategy, competitive analysis, risk assessment, and next best actions. I analyze your Salesforce data including opportunities, accounts, tasks, and historical patterns. What specific challenge are you facing with your deals?'
    }
    
    return 'I understand you\'re asking about your sales pipeline. I have access to your Salesforce data and can provide insights on opportunities, account relationships, competitive positioning, and deal progression strategies. Could you be more specific about what you\'d like to analyze?'
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your opportunities, deals, or account strategy..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}