import { apiService } from './ApiService'
import type { ApiResponse, Opportunity } from '@/types'

export interface OpportunityUpdateRequest {
  stageName?: string
  amount?: number
  probability?: number
  closeDate?: string
  notes?: string
}

export interface OpportunityAnalysis {
  winProbability: number
  riskFactors: string[]
  recommendations: Array<{
    action: string
    priority: 'high' | 'medium' | 'low'
    reason: string
  }>
  similarDeals: Opportunity[]
}

export class OpportunityService {
  async getOpportunities(): Promise<ApiResponse<Opportunity[]>> {
    return apiService.get<Opportunity[]>('/opportunities')
  }

  async getOpportunity(id: string): Promise<ApiResponse<Opportunity>> {
    return apiService.get<Opportunity>(`/opportunity/${id}`)
  }

  async updateOpportunity(
    id: string, 
    updates: OpportunityUpdateRequest
  ): Promise<ApiResponse<Opportunity>> {
    return apiService.put<Opportunity>(`/opportunity/${id}`, updates)
  }

  async analyzeOpportunity(id: string): Promise<ApiResponse<OpportunityAnalysis>> {
    return apiService.post<OpportunityAnalysis>(`/opportunity/${id}/analyze`)
  }

  async getSimilarOpportunities(
    industry: string, 
    amount: number
  ): Promise<ApiResponse<Opportunity[]>> {
    return apiService.get<Opportunity[]>(
      `/opportunities/similar?industry=${encodeURIComponent(industry)}&amount=${amount}`
    )
  }
}

export const opportunityService = new OpportunityService()