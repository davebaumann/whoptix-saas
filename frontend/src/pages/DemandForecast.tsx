import { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp, Package, Calendar, Shield } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import WithMembershipCheck from '../components/WithMembershipCheck'

interface DemandForecastItem {
  sku: string
  productName: string
  category: string
  historicalAvgDailyDemand: number
  forecastedDemand: number
  demandTrend: number
  currentStock: number
  daysOfStockAvailable: number
  recommendedSafetyStock: number
  confidenceScore: number
  riskLevel: string
}

interface DemandForecastSummary {
  totalSKUsAnalyzed: number
  totalForecastedDemand: number
  avgDailyDemand: number
  criticalRiskCount: number
  highRiskCount: number
  mediumRiskCount: number
  lowRiskCount: number
  forecastPeriodDays: number
}

export default function DemandForecast() {
  const { user } = useAuth()
  const customerId = user?.customerId || 1
  const [summary, setSummary] = useState<DemandForecastSummary | null>(null)
  const [forecasts, setForecasts] = useState<DemandForecastItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [forecastDays, setForecastDays] = useState(30)
  const [sortBy, setSortBy] = useState<'risk' | 'demand' | 'trend'>('risk')
  const [filterRisk, setFilterRisk] = useState<string>('all')

  useEffect(() => {
    const fetchDemandForecast = async () => {
      if (!customerId) return

      try {
        setLoading(true)
        setError('')
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/reports/customer/${customerId}/demand-forecast?forecastDays=${forecastDays}`,
          { credentials: 'include' }
        )

        if (!response.ok) throw new Error(`Error: ${response.statusText}`)

        const data = await response.json()
        setSummary(data.summary)
        setForecasts(data.allForecasts || data.forecasts || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load demand forecast')
        setSummary(null)
        setForecasts([])
      } finally {
        setLoading(false)
      }
    }

    fetchDemandForecast()
  }, [customerId, forecastDays])

  const getSortedForecasts = () => {
    let sorted = [...forecasts]

    if (filterRisk !== 'all') {
      sorted = sorted.filter(f => f.riskLevel === filterRisk)
    }

    switch (sortBy) {
      case 'demand':
        return sorted.sort((a, b) => b.forecastedDemand - a.forecastedDemand)
      case 'trend':
        return sorted.sort((a, b) => b.demandTrend - a.demandTrend)
      case 'risk':
      default:
        return sorted.sort((a, b) => {
          const riskOrder = { Critical: 3, High: 2, Medium: 1, Low: 0 }
          return (riskOrder[b.riskLevel as keyof typeof riskOrder] ?? 0) -
            (riskOrder[a.riskLevel as keyof typeof riskOrder] ?? 0)
        })
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getRiskBgColor = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'bg-red-50 hover:bg-red-100'
      case 'High':
        return 'bg-orange-50 hover:bg-orange-100'
      case 'Medium':
        return 'bg-yellow-50 hover:bg-yellow-100'
      case 'Low':
        return 'bg-green-50 hover:bg-green-100'
      default:
        return 'bg-gray-50 hover:bg-gray-100'
    }
  }

  const sortedForecasts = getSortedForecasts()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  return (
    <WithMembershipCheck reportName="demand-forecast" reportDisplayName="Demand Forecast">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Demand Forecast</h1>
          <p className="text-gray-600 mt-1">Predict future inventory needs based on historical sales patterns</p>
        </div>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Period</label>
            <select
              value={forecastDays}
              onChange={(e) => setForecastDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">SKUs Analyzed</p>
                <p className="text-3xl font-bold text-gray-900">{summary.totalSKUsAnalyzed}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Forecasted Demand</p>
                <p className="text-3xl font-bold text-gray-900">{Math.round(summary.totalForecastedDemand)}</p>
                <p className="text-xs text-gray-500 mt-1">units in {summary.forecastPeriodDays} days</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Avg Daily Demand</p>
                <p className="text-3xl font-bold text-gray-900">{summary.avgDailyDemand.toFixed(1)}</p>
                <p className="text-xs text-gray-500 mt-1">units/day</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">At-Risk SKUs</p>
                <p className="text-3xl font-bold text-gray-900">
                  {summary.criticalRiskCount + summary.highRiskCount}
                </p>
                <p className="text-xs text-gray-500 mt-1">Critical + High</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </div>
        </div>
      )}

      {/* Risk Distribution */}
      {summary && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
              <Shield className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{summary.criticalRiskCount}</p>
              <p className="text-sm text-red-600">Critical</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
              <Shield className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-600">{summary.highRiskCount}</p>
              <p className="text-sm text-orange-600">High</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <Shield className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-600">{summary.mediumRiskCount}</p>
              <p className="text-sm text-yellow-600">Medium</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <Shield className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{summary.lowRiskCount}</p>
              <p className="text-sm text-green-600">Low</p>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Demand Forecasts</h2>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="risk">Sort: Risk Level</option>
                <option value="demand">Sort: Forecasted Demand</option>
                <option value="trend">Sort: Trend</option>
              </select>
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Risks</option>
                <option value="Critical">Critical Only</option>
                <option value="High">High & Critical</option>
                <option value="Medium">Medium & Above</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Avg Daily</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Forecast</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Trend</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Days Left</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Confidence</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedForecasts.slice(0, 50).map((item, idx) => (
                <tr key={idx} className={`transition-colors ${getRiskBgColor(item.riskLevel)}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-semibold text-gray-900">
                    {item.sku}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                    {item.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {item.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                    {item.historicalAvgDailyDemand.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                    {Math.round(item.forecastedDemand)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`font-semibold ${item.demandTrend > 0 ? 'text-green-600' : item.demandTrend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {item.demandTrend > 0 ? '+' : ''}{item.demandTrend.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {item.currentStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    {item.daysOfStockAvailable > 0 ? (
                      <span className={item.daysOfStockAvailable < 7 ? 'font-semibold text-red-600' : 'text-gray-900'}>
                        {item.daysOfStockAvailable.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-red-600 font-semibold">Out soon</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                    {item.confidenceScore.toFixed(0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(item.riskLevel)}`}>
                      {item.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedForecasts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No demand forecasts available
          </div>
        )}
      </div>

      {sortedForecasts.length > 50 && (
        <p className="text-center text-sm text-gray-600">
          Showing 50 of {sortedForecasts.length} forecasts. Apply filters to see more specific results.
        </p>
      )}
      </div>
    </WithMembershipCheck>
  )
}
