import type { AppConfig } from '@types/index'

export const config: AppConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  salesforceClientId: import.meta.env.VITE_SALESFORCE_CLIENT_ID || '',
  salesforceRedirectUri: import.meta.env.VITE_SALESFORCE_REDIRECT_URI || '',
  enableDebugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  appName: import.meta.env.VITE_APP_NAME || 'Salesforce Opportunity Assistant',
  maxChatHistory: parseInt(import.meta.env.VITE_MAX_CHAT_HISTORY) || 50,
}