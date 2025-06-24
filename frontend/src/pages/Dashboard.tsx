import { useState, useEffect } from 'react'
import { opportunityService } from '@/services'
import type { Opportunity } from '@/types'

const mockOpportunities: Opportunity[] = [
  {
    id: '1',
    name: 'Enterprise Software Implementation',
    amount: 250000,
    stageName: 'Proposal/Price Quote',
    closeDate: '2024-07-15',
    probability: 60,
    accountId: 'acc1',
    accountName: 'TechCorp Industries'
  },
  {
    id: '2',
    name: 'Cloud Infrastructure Upgrade',
    amount: 150000,
    stageName: 'Needs Analysis',
    closeDate: '2024-08-01',
    probability: 30,
    accountId: 'acc2',
    accountName: 'Global Manufacturing Co'
  },
  {
    id: '3',
    name: 'Digital Transformation Project',
    amount: 400000,
    stageName: 'Negotiation/Review',
    closeDate: '2024-06-30',
    probability: 75,
    accountId: 'acc3',
    accountName: 'Financial Services Ltd'
  }
]

export default function Dashboard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await opportunityService.getOpportunities()
        
        if (response.success && response.data) {
          setOpportunities(response.data)
        } else {
          // Fallback to mock data if API fails
          console.warn('API failed, using mock data:', response.error)
          setOpportunities(mockOpportunities)
          setError('Using demo data - API connection failed')
        }
      } catch (error) {
        console.error('Failed to fetch opportunities:', error)
        // Fallback to mock data
        setOpportunities(mockOpportunities)
        setError('Using demo data - API connection failed')
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunities()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStageColor = (stage: string) => {
    const stageColors: Record<string, string> = {
      'Prospecting': 'bg-gray-100 text-gray-800',
      'Qualification': 'bg-blue-100 text-blue-800',
      'Needs Analysis': 'bg-yellow-100 text-yellow-800',
      'Value Proposition': 'bg-purple-100 text-purple-800',
      'Id. Decision Makers': 'bg-indigo-100 text-indigo-800',
      'Proposal/Price Quote': 'bg-orange-100 text-orange-800',
      'Negotiation/Review': 'bg-green-100 text-green-800',
      'Closed Won': 'bg-green-100 text-green-800',
      'Closed Lost': 'bg-red-100 text-red-800'
    }
    return stageColors[stage] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const refreshData = async () => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await opportunityService.getOpportunities()
        
        if (response.success && response.data) {
          setOpportunities(response.data)
        } else {
          setOpportunities(mockOpportunities)
          setError('Using demo data - API connection failed')
        }
      } catch (error) {
        console.error('Failed to fetch opportunities:', error)
        setOpportunities(mockOpportunities)
        setError('Using demo data - API connection failed')
      } finally {
        setLoading(false)
      }
    }

    await fetchOpportunities()
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-lg text-sm flex justify-between items-center">
          <span><strong>Notice:</strong> {error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-yellow-500 hover:text-yellow-700"
          >
            ×
          </button>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Sales Dashboard</h2>
        <div className="flex space-x-4">
          <button
            onClick={refreshData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Pipeline</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(opportunities.reduce((sum, opp) => sum + opp.amount, 0))}
            </div>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow">
            <div className="text-sm text-gray-500">Opportunities</div>
            <div className="text-2xl font-bold text-gray-900">{opportunities.length}</div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Opportunities</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opportunity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Close Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Probability
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {opportunities.map((opportunity) => (
                <tr key={opportunity.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{opportunity.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{opportunity.accountName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(opportunity.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStageColor(opportunity.stageName)}`}>
                      {opportunity.stageName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(opportunity.closeDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="text-sm font-medium text-gray-900">{opportunity.probability}%</div>
                      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${opportunity.probability}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}