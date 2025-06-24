import { apiService } from './ApiService'
import { config } from '@/utils/config'
import type { ApiResponse, User } from '@/types'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  instanceUrl: string
  expiresAt: number
}

export interface SalesforceAuthUrl {
  authUrl: string
  state: string
}

export class AuthService {
  private readonly ACCESS_TOKEN_KEY = 'sf_access_token'
  private readonly REFRESH_TOKEN_KEY = 'sf_refresh_token'
  private readonly INSTANCE_URL_KEY = 'sf_instance_url'
  private readonly EXPIRES_AT_KEY = 'sf_expires_at'

  async getSalesforceAuthUrl(): Promise<ApiResponse<SalesforceAuthUrl>> {
    // Redirect directly to the login endpoint
    window.location.href = `${config.apiBaseUrl}/auth/salesforce/login`
    return { success: true, data: { authUrl: '', state: '' } }
  }

  async handleAuthCallback(code: string, state: string): Promise<ApiResponse<AuthTokens>> {
    const response = await apiService.get<AuthTokens>(`/auth/salesforce/callback?code=${code}&state=${state}`)

    if (response.success && response.data) {
      this.storeTokens(response.data)
    }

    return response
  }

  async refreshToken(): Promise<ApiResponse<AuthTokens>> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      return {
        success: false,
        data: {} as AuthTokens,
        error: 'No refresh token available'
      }
    }

    const response = await apiService.post<AuthTokens>('/auth/salesforce/refresh', {
      sessionId: refreshToken
    })

    if (response.success && response.data) {
      this.storeTokens(response.data)
    }

    return response
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiService.get<User>('/user/me')
  }

  async logout(): Promise<void> {
    this.clearTokens()
    // Optionally call backend logout endpoint
    try {
      await apiService.post('/auth/salesforce/logout', {
        sessionId: this.getRefreshToken()
      })
    } catch (error) {
      // Ignore logout errors
      console.warn('Logout API call failed:', error)
    }
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken()
    const expiresAt = this.getExpiresAt()
    
    if (!token || !expiresAt) {
      return false
    }

    return Date.now() < expiresAt
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY)
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  getInstanceUrl(): string | null {
    return localStorage.getItem(this.INSTANCE_URL_KEY)
  }

  private getExpiresAt(): number | null {
    const expiresAt = localStorage.getItem(this.EXPIRES_AT_KEY)
    return expiresAt ? parseInt(expiresAt, 10) : null
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken)
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refreshToken)
    localStorage.setItem(this.INSTANCE_URL_KEY, tokens.instanceUrl)
    localStorage.setItem(this.EXPIRES_AT_KEY, tokens.expiresAt.toString())
  }

  private clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    localStorage.removeItem(this.INSTANCE_URL_KEY)
    localStorage.removeItem(this.EXPIRES_AT_KEY)
  }

  // Redirect to Salesforce OAuth
  async redirectToSalesforceAuth(): Promise<void> {
    const response = await this.getSalesforceAuthUrl()
    if (response.success && response.data) {
      window.location.href = response.data.authUrl
    } else {
      throw new Error(response.error || 'Failed to get auth URL')
    }
  }
}

export const authService = new AuthService()