import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import AutoRefreshControls from '../components/AutoRefreshControls'
import WithMembershipCheck from '../components/WithMembershipCheck'
import { BarChart3, TrendingUp, TrendingDown, Clock, Package, AlertTriangle } from 'lucide-react'

interface InventoryTurnoverItem {
  sku: string
  totalSold: number
  totalReceived: number
  currentStock: number
  transactionCount: number
  firstTransaction: string
  lastTransaction: string
  turnoverRate: number
  daysOnHand: number
}

interface InventoryTurnoverResponse {
  reportPeriod: string
  periodDays: number
  turnoverData: InventoryTurnoverItem[]
}

const InventoryTurnoverContent = () => {
  const { user } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [days, setDays] = useState(90)
  const [sortField, setSortField] = useState<keyof InventoryTurnoverItem>('turnoverRate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'fast' | 'medium' | 'slow' | 'dead'>('all')
  const pageSize = 25

  const customerId = user?.customerId || 1

  const { data: turnoverData, isLoading } = useQuery<InventoryTurnoverResponse>({
    queryKey: ['inventoryTurnoverReport', customerId, days],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/reports/customer/${customerId}/inventory-turnover?days=${days}`,
        {
          credentials: 'include'
        }
      )
      if (!response.ok) {
        throw new Error('Failed to fetch inventory turnover report')
      }
      return response.json()
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  })

  const handleSort = (field: keyof InventoryTurnoverItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getPerformanceCategory = (turnoverRate: number, daysOnHand: number) => {
    if (turnoverRate >= 4) return 'fast'
    if (turnoverRate >= 2) return 'medium'
    if (turnoverRate >= 0.5) return 'slow'
    return 'dead'
  }

  const getPerformanceLabel = (category: string) => {
    switch (category) {
      case 'fast': return { label: 'Fast Moving', color: 'text-green-600 bg-green-100' }
      case 'medium': return { label: 'Medium Moving', color: 'text-yellow-600 bg-yellow-100' }
      case 'slow': return { label: 'Slow Moving', color: 'text-orange-600 bg-orange-100' }
      case 'dead': return { label: 'Dead Stock', color: 'text-red-600 bg-red-100' }
      default: return { label: 'Unknown', color: 'text-gray-600 bg-gray-100' }
    }
  }

  const getSortedData = () => {
    if (!turnoverData) return []
    
    let filtered = turnoverData.turnoverData
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => {
        const category = getPerformanceCategory(item.turnoverRate, item.daysOnHand)
        return category === selectedCategory
      })
    }

    const sorted = [...filtered].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      const multiplier = sortDirection === 'asc' ? 1 : -1
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * multiplier
      }
      return ((aVal as number) - (bVal as number)) * multiplier
    })

    const startIndex = (currentPage - 1) * pageSize
    return sorted.slice(startIndex, startIndex + pageSize)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStockStatus = (daysOnHand: number) => {
    if (daysOnHand === Number.MAX_VALUE || daysOnHand > 365) {
      return { status: 'Overstocked', color: 'text-red-600', icon: AlertTriangle }
    }
    if (daysOnHand > 180) {
      return { status: 'High Stock', color: 'text-orange-600', icon: TrendingUp }
    }
    if (daysOnHand > 90) {
      return { status: 'Normal Stock', color: 'text-green-600', icon: Package }
    }
    if (daysOnHand > 30) {
      return { status: 'Low Stock', color: 'text-yellow-600', icon: TrendingDown }
    }
    return { status: 'Critical Stock', color: 'text-red-600', icon: AlertTriangle }
  }

  const calculateSummaryStats = () => {
    if (!turnoverData) return null

    const data = turnoverData.turnoverData
    const fastMoving = data.filter(item => getPerformanceCategory(item.turnoverRate, item.daysOnHand) === 'fast')
    const mediumMoving = data.filter(item => getPerformanceCategory(item.turnoverRate, item.daysOnHand) === 'medium')
    const slowMoving = data.filter(item => getPerformanceCategory(item.turnoverRate, item.daysOnHand) === 'slow')
    const deadStock = data.filter(item => getPerformanceCategory(item.turnoverRate, item.daysOnHand) === 'dead')

    return {
      total: data.length,
      fastMoving: fastMoving.length,
      mediumMoving: mediumMoving.length,
      slowMoving: slowMoving.length,
      deadStock: deadStock.length,
      avgTurnoverRate: data.length > 0 ? (data.reduce((sum, item) => sum + item.turnoverRate, 0) / data.length) : 0,
      totalStock: data.reduce((sum, item) => sum + item.currentStock, 0),
    }
  }

  const summary = calculateSummaryStats()
  const sortedData = getSortedData()
  const totalPages = turnoverData ? Math.ceil(turnoverData.turnoverData.length / pageSize) : 0

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading turnover analysis...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Turnover Report</h1>
          <p className="mt-1 text-sm text-gray-600">
            Analyze inventory velocity and identify fast/slow moving items
          </p>
          {turnoverData && (
            <p className="mt-1 text-xs text-gray-500">
              Report Period: {turnoverData.reportPeriod}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Auto-refresh controls */}
          <AutoRefreshControls 
            queryKey={['inventoryTurnoverReport', customerId.toString(), days]} 
            defaultInterval={300000} // 5 minutes default
            className="bg-white px-3 py-2 rounded-md border border-gray-300"
          />
          
          {/* Days Selector */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={30}>Last 30 Days</option>
            <option value={60}>Last 60 Days</option>
            <option value={90}>Last 90 Days</option>
            <option value={180}>Last 6 Months</option>
            <option value={365}>Last Year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total SKUs</h3>
            <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Fast Moving</h3>
            <p className="text-2xl font-bold text-green-600">{summary.fastMoving}</p>
            <p className="text-xs text-gray-500">{summary.total > 0 ? Math.round((summary.fastMoving / summary.total) * 100) : 0}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Medium Moving</h3>
            <p className="text-2xl font-bold text-yellow-600">{summary.mediumMoving}</p>
            <p className="text-xs text-gray-500">{summary.total > 0 ? Math.round((summary.mediumMoving / summary.total) * 100) : 0}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Slow Moving</h3>
            <p className="text-2xl font-bold text-orange-600">{summary.slowMoving}</p>
            <p className="text-xs text-gray-500">{summary.total > 0 ? Math.round((summary.slowMoving / summary.total) * 100) : 0}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Dead Stock</h3>
            <p className="text-2xl font-bold text-red-600">{summary.deadStock}</p>
            <p className="text-xs text-gray-500">{summary.total > 0 ? Math.round((summary.deadStock / summary.total) * 100) : 0}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg Turnover Rate</h3>
            <p className="text-2xl font-bold text-blue-600">{summary.avgTurnoverRate.toFixed(2)}x</p>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="category-filter" className="text-sm font-medium text-gray-700">
              Filter by Performance:
            </label>
            <select
              id="category-filter"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value as any)
                setCurrentPage(1)
              }}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Items</option>
              <option value="fast">Fast Moving</option>
              <option value="medium">Medium Moving</option>
              <option value="slow">Slow Moving</option>
              <option value="dead">Dead Stock</option>
            </select>
          </div>
          
          {turnoverData && (
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, turnoverData.turnoverData.length)} of {turnoverData.turnoverData.length} items
            </div>
          )}
        </div>
      </div>

      {/* Turnover Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Inventory Turnover Analysis</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('sku')}
                >
                  SKU {sortField === 'sku' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('turnoverRate')}
                >
                  Turnover Rate {sortField === 'turnoverRate' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('daysOnHand')}
                >
                  Days on Hand {sortField === 'daysOnHand' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('currentStock')}
                >
                  Current Stock {sortField === 'currentStock' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalSold')}
                >
                  Total Sold {sortField === 'totalSold' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity Period
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((item, index) => {
                const category = getPerformanceCategory(item.turnoverRate, item.daysOnHand)
                const performance = getPerformanceLabel(category)
                const stockStatus = getStockStatus(item.daysOnHand)
                const StatusIcon = stockStatus.icon
                
                return (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-semibold">
                        {item.turnoverRate.toFixed(2)}x
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.daysOnHand === Number.MAX_VALUE ? (
                        <span className="text-red-600">No Sales</span>
                      ) : (
                        <span>{item.daysOnHand.toFixed(0)} days</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.currentStock.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalSold.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${performance.color}`}>
                        {performance.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-1">
                        <StatusIcon className={`w-4 h-4 ${stockStatus.color}`} />
                        <span className={stockStatus.color}>{stockStatus.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="text-xs">
                        <div>First: {formatDate(item.firstTransaction)}</div>
                        <div>Last: {formatDate(item.lastTransaction)}</div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const InventoryTurnoverReport = () => {
  return (
    <WithMembershipCheck reportName="inventory-turnover" reportDisplayName="Inventory Turnover Analysis">
      <InventoryTurnoverContent />
    </WithMembershipCheck>
  )
}

export default InventoryTurnoverReport