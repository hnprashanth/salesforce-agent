// API types
export interface ApiResponse<T = any> {
  success: boolean
  data: T
  error?: string
}

// Salesforce types
export interface Opportunity {
  id: string
  name: string
  amount: number
  stageName: string
  closeDate: string
  probability: number
  accountId: string
  accountName: string
}

export interface Account {
  id: string
  name: string
  industry: string
  annualRevenue?: number
}

// Chat types
export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  actions?: ChatAction[]
}

export interface ChatAction {
  id: string
  label: string
  action: string
  payload?: any
}

// Application types
export interface User {
  id: string
  name: string
  email: string
}

export interface AppConfig {
  apiBaseUrl: string
  apiTimeout: number
  salesforceClientId: string
  salesforceRedirectUri: string
  enableDebugMode: boolean
  enableAnalytics: boolean
  appName: string
  maxChatHistory: number
}