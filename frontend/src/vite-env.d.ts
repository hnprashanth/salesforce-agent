/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_SALESFORCE_CLIENT_ID: string
  readonly VITE_SALESFORCE_REDIRECT_URI: string
  readonly VITE_ENABLE_DEBUG_MODE: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_APP_NAME: string
  readonly VITE_MAX_CHAT_HISTORY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}