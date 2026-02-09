import { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp, Package, Calendar, Shield, Info, Download } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api/client'
import WithMembershipCheck from '../components/WithMembershipCheck'

// InfoTooltip component
const InfoTooltip = ({ text, children }: { text: string; children?: React.ReactNode }) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    setShowTooltip(true)
  }

  const handleMouseLeave = () => {
    setShowTooltip(false)
  }

  return (
    <div className="relative inline-flex items-center gap-1 group">
      {children}
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          handleMouseEnter(e)
          setShowTooltip(!showTooltip)
        }}
      >
        <Info className="w-4 h-4" />
      </button>
      {showTooltip && (
        <div className="fixed bg-gray-900 text-white text-xs rounded p-3 w-64 shadow-lg z-[9999]" 
             style={{
               left: `${tooltipPos.x}px`,
               top: `${tooltipPos.y}px`,
               transform: 'translateX(-50%) translateY(-100%)',
               marginTop: '-8px'
             }}>
          {text}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  )
}

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
  // Check if admin is viewing as another customer
  const adminViewingData = sessionStorage.getItem('adminViewingAs');
  const adminViewingCustomerId = adminViewingData ? JSON.parse(adminViewingData).customerId : null;
  
  // Use impersonated customer ID if admin is viewing as, otherwise use user's own customer ID
  const customerId = adminViewingCustomerId || user?.customerId || 1
  const [summary, setSummary] = useState<DemandForecastSummary | null>(null)
  const [forecasts, setForecasts] = useState<DemandForecastItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [forecastDays, setForecastDays] = useState(30)
  const [sortBy, setSortBy] = useState<'risk' | 'demand' | 'trend'>('risk')
  const [filterRisk, setFilterRisk] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  useEffect(() => {
    const fetchDemandForecast = async () => {
      if (!customerId) return

      try {
        setLoading(true)
        setError('')
        const data = await apiClient.getDemandForecast(customerId, forecastDays)
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

  useEffect(() => {
    setCurrentPage(1)
  }, [filterRisk, sortBy])

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

  const sortedForecasts = getSortedForecasts()
  const totalPages = Math.ceil(sortedForecasts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedForecasts = sortedForecasts.slice(startIndex, endIndex)

  const exportToCsv = () => {
    if (sortedForecasts.length === 0) return

    const rows: string[] = []
    
    // Header row
    rows.push('SKU,Product Name,Category,Historical Avg Daily Demand,Forecasted Demand,Demand Trend %,Current Stock,Days of Stock Available,Recommended Safety Stock,Confidence Score,Risk Level')
    
    // Data rows
    sortedForecasts.forEach((item: DemandForecastItem) => {
      rows.push(
        `"${item.sku}","${item.productName}","${item.category}",${item.historicalAvgDailyDemand.toFixed(2)},${item.forecastedDemand.toFixed(2)},${item.demandTrend.toFixed(2)},${item.currentStock},${item.daysOfStockAvailable.toFixed(2)},${item.recommendedSafetyStock.toFixed(2)},${item.confidenceScore.toFixed(2)},"${item.riskLevel}"`
      )
    })
    
    // Create blob and download
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `demand-forecast-${forecastDays}days-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Forecast Period</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setForecastDays(7)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  forecastDays === 7
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setForecastDays(14)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  forecastDays === 14
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                14 Days
              </button>
              <button
                onClick={() => setForecastDays(30)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  forecastDays === 30
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setForecastDays(60)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  forecastDays === 60
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                60 Days
              </button>
              <button
                onClick={() => setForecastDays(90)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  forecastDays === 90
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                90 Days
              </button>
            </div>
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
              <button
                onClick={exportToCsv}
                disabled={sortedForecasts.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
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
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <div className="flex justify-center items-center gap-1">
                    Trend
                    <InfoTooltip text="Linear regression of daily sales over 90 days. Positive % indicates increasing demand, negative indicates decreasing demand." />
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <div className="flex justify-end items-center gap-1">
                    Days Left
                    <InfoTooltip text="Current stock ÷ average daily demand. Shows how many days until stockout at current consumption rate." />
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <div className="flex justify-center items-center gap-1">
                    Confidence
                    <InfoTooltip text="Based on demand variance (0-100%). Higher = more predictable demand. Lower variance in sales = higher confidence in forecast." />
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  <div className="flex justify-center items-center gap-1">
                    Risk
                    <InfoTooltip text="Critical: &lt;7 days stock | High: 7-13 days | Medium: 14-29 days | Low: 30+ days" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedForecasts.map((item, idx) => (
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

        {sortedForecasts.length > 0 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold">{startIndex + 1}</span> to <span className="font-semibold">{Math.min(endIndex, sortedForecasts.length)}</span> of <span className="font-semibold">{sortedForecasts.length}</span> results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }
                  
                  if (pageNum < 1 || pageNum > totalPages) return null
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </WithMembershipCheck>
  )
}
