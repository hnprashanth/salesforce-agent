import { ChatContainer } from '@/components/Chat'

export default function Chat() {
  return (
    <div className="container mx-auto max-w-4xl">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Assistant</h2>
        <p className="text-gray-600">
          Get insights about your opportunities, deals, and account strategy with AI-powered assistance.
        </p>
      </div>
      
      <ChatContainer className="h-[calc(100vh-200px)] min-h-[600px]" />
    </div>
  )
}