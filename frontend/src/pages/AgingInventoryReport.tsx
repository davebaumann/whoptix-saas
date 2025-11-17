import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import AutoRefreshControls from '../components/AutoRefreshControls'

interface AgingInventoryItem {
  sku: string
  currentQuantity: number
  days0_30: number
  days31_60: number
  days61_90: number
  days90Plus: number
  oldestReceiveDate: string
  averageDaysOld: number
}

interface AgingInventorySummary {
  totalSkus: number
  totalQuantity: number
  days0_30_Total: number
  days31_60_Total: number
  days61_90_Total: number
  days90Plus_Total: number
}

interface AgingInventoryResponse {
  reportDate: string
  summary: AgingInventorySummary
  details: AgingInventoryItem[]
}

export default function AgingInventoryReport() {
  const { user, isLoading: authLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<keyof AgingInventoryItem>('averageDaysOld')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const pageSize = 25

  // Early loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Check authentication and customer ID
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Authentication required.</p>
        </div>
      </div>
    )
  }

  const customerId = user.customerId || 1 // Fallback to customer 1 if no association

  // Debug logging
  console.log('AgingInventoryReport - User:', user)
  console.log('AgingInventoryReport - Customer ID:', customerId)

  const { data: agingData, isLoading } = useQuery<AgingInventoryResponse>({
    queryKey: ['agingInventoryReport', customerId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/customer/${customerId}/aging-inventory`, {
        credentials: 'include', // Use cookies for authentication like other working reports
        headers: {
          'Content-Type': 'application/json',
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch aging inventory report')
      }
      return response.json()
    },
  })

  const handleSort = (field: keyof AgingInventoryItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const getSortedData = () => {
    if (!agingData) return []
    
    const sorted = [...agingData.details].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }
      
      const numA = Number(aValue)
      const numB = Number(bValue)
      return sortDirection === 'asc' ? numA - numB : numB - numA
    })
    
    return sorted
  }

  const paginatedData = getSortedData().slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const totalPages = Math.ceil((agingData?.details.length || 0) / pageSize)

  const getAgeColor = (days: number): string => {
    if (days <= 30) return 'text-green-600'
    if (days <= 60) return 'text-yellow-600'
    if (days <= 90) return 'text-orange-600'
    return 'text-red-600'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Aging Inventory Report</h1>
          <p className="mt-1 text-sm text-gray-600">
            Analyze inventory age based on FIFO (First In, First Out) using Add/Return transaction dates
          </p>
        </div>
        
        {/* Auto-refresh controls */}
        <AutoRefreshControls 
          queryKey={['agingInventoryReport', customerId.toString()]} 
          defaultInterval={900000} // 15 minutes default for aging data
          className="bg-white px-4 py-2 rounded-lg shadow"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : agingData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total SKUs</h3>
              <p className="text-2xl font-bold text-gray-900">{agingData.summary.totalSkus}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">0-30 Days</h3>
              <p className="text-2xl font-bold text-green-600">{agingData.summary.days0_30_Total}</p>
              <p className="text-xs text-gray-500">{formatPercentage(agingData.summary.days0_30_Total, agingData.summary.totalQuantity)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">31-60 Days</h3>
              <p className="text-2xl font-bold text-yellow-600">{agingData.summary.days31_60_Total}</p>
              <p className="text-xs text-gray-500">{formatPercentage(agingData.summary.days31_60_Total, agingData.summary.totalQuantity)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">61-90 Days</h3>
              <p className="text-2xl font-bold text-orange-600">{agingData.summary.days61_90_Total}</p>
              <p className="text-xs text-gray-500">{formatPercentage(agingData.summary.days61_90_Total, agingData.summary.totalQuantity)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">90+ Days</h3>
              <p className="text-2xl font-bold text-red-600">{agingData.summary.days90Plus_Total}</p>
              <p className="text-xs text-gray-500">{formatPercentage(agingData.summary.days90Plus_Total, agingData.summary.totalQuantity)}</p>
            </div>
          </div>

          {/* Report Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              Report generated on {formatDate(agingData.reportDate)} • 
              Aging calculated using FIFO method based on Add/Return transaction dates
            </p>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
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
                      onClick={() => handleSort('currentQuantity')}
                    >
                      Current Qty {sortField === 'currentQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('days0_30')}
                    >
                      0-30 Days {sortField === 'days0_30' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('days31_60')}
                    >
                      31-60 Days {sortField === 'days31_60' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('days61_90')}
                    >
                      61-90 Days {sortField === 'days61_90' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('days90Plus')}
                    >
                      90+ Days {sortField === 'days90Plus' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('averageDaysOld')}
                    >
                      Avg Age {sortField === 'averageDaysOld' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('oldestReceiveDate')}
                    >
                      Oldest Add {sortField === 'oldestReceiveDate' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((item, index) => (
                    <tr key={item.sku} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.currentQuantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {item.days0_30}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                        {item.days31_60}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                        {item.days61_90}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                        {item.days90Plus}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getAgeColor(item.averageDaysOld)}`}>
                        {item.averageDaysOld} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.oldestReceiveDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * pageSize, agingData.details.length)}</span> of{' '}
                      <span className="font-medium">{agingData.details.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      })}
                      <button
                        onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No aging inventory data available</p>
        </div>
      )}
    </div>
  )
}