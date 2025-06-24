# Chat Components

A modern, responsive chat interface for the Salesforce AI Assistant. This component system provides a clean, modular architecture for real-time chat functionality.

## Components Overview

### ChatContainer
Main container component that orchestrates all chat functionality.

**Features:**
- Session management with unique session IDs
- Error handling and display
- Message state management
- Auto-scroll to latest messages
- API integration with chat service

**Props:**
- `className?: string` - Optional CSS classes

### MessageList
Renders the list of chat messages with proper scrolling.

**Features:**
- Efficient message rendering
- Typing indicator integration
- Auto-scroll functionality
- Responsive layout

**Props:**
- `messages: ChatMessage[]` - Array of chat messages
- `isLoading: boolean` - Loading state for typing indicator
- `onActionClick: (action: string, payload?: Record<string, unknown>) => void` - Action handler
- `messagesEndRef: RefObject<HTMLDivElement | null>` - Scroll reference

### Message
Individual message component with timestamp and action buttons.

**Features:**
- User/assistant message differentiation
- Timestamp display
- Action button integration
- Responsive design (70% max width on mobile, larger on desktop)
- Proper text wrapping and formatting

**Props:**
- `message: ChatMessage` - Message data
- `onActionClick: (action: string, payload?: Record<string, unknown>) => void` - Action handler

### ChatInput
Input component with enhanced UX features.

**Features:**
- Auto-resizing textarea
- Keyboard shortcuts (Enter to send, Shift+Enter for new line)
- Character counter
- Loading states with spinner
- Disabled state handling

**Props:**
- `onSendMessage: (message: string) => void` - Send message handler
- `disabled?: boolean` - Disable input during loading
- `placeholder?: string` - Input placeholder text

### TypingIndicator
Animated typing indicator for AI responses.

**Features:**
- Bouncing dots animation
- Proper timing with CSS delays
- Consistent styling with chat messages

### ActionButton
Interactive buttons for AI suggested actions.

**Features:**
- Dynamic icons based on action type
- Color-coded variants (primary, success, warning, info, secondary)
- Confidence percentage display
- Accessibility features
- Hover and focus states

**Props:**
- `action: ChatAction` - Action data
- `onClick: () => void` - Click handler
- `disabled?: boolean` - Disable button

## Styling

All components use Tailwind CSS with:
- Responsive design principles
- Consistent color palette
- Smooth animations and transitions
- Accessibility-first approach
- Mobile-optimized layouts

## Usage Example

```tsx
import { ChatContainer } from '@/components/Chat'

export default function ChatPage() {
  return (
    <div className="container mx-auto max-w-4xl">
      <ChatContainer className="h-[calc(100vh-200px)] min-h-[600px]" />
    </div>
  )
}
```

## Accessibility Features

- ARIA labels for all interactive elements
- Keyboard navigation support
- Screen reader compatible
- Focus management
- Semantic HTML structure

## Action Types

The system supports various action types with corresponding icons:
- `update_opportunity`, `update_stage` → 📈 (Success variant)
- `schedule_followup`, `schedule` → 📅 (Info variant)
- `generate_email`, `email` → ✉️ (Warning variant)
- `view_similar`, `view_deals` → 👀 (Secondary variant)
- `analyze`, `analysis` → 🔍 (Primary variant)
- `create_task`, `task` → ✅ (Primary variant)
- Default → ⚡ (Primary variant)

## Integration

The components integrate seamlessly with:
- TypeScript for type safety
- Chat service API
- Responsive design system
- Error handling middleware
- Session management