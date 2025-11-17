import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api/client'
import AutoRefreshControls from '../components/AutoRefreshControls'

export default function LowStockReport() {
  const { user, isLoading: authLoading } = useAuth()
  const [threshold, setThreshold] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
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
  console.log('LowStockReport - User:', user)
  console.log('LowStockReport - Customer ID:', customerId)

  const { data: lowStockData, isLoading } = useQuery({
    queryKey: ['lowStockReport', customerId, threshold, currentPage],
    queryFn: () => apiClient.getLowStockReport(customerId, threshold, currentPage, pageSize),
  })

  const handleThresholdChange = (newThreshold: number) => {
    setThreshold(newThreshold)
    setCurrentPage(1) // Reset to first page when changing threshold
  }

  const getStockLevelColor = (level: string) => {
    switch (level) {
      case 'Out of Stock':
        return 'bg-red-100 text-red-800'
      case 'Critical':
        return 'bg-orange-100 text-orange-800'
      case 'Low':
        return 'bg-yellow-100 text-yellow-800'
      case 'Warning':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Low Stock Inventory Report</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor inventory levels and identify items that need restocking
          </p>
          <div className="mt-2">
            <a 
              href="/low-stock-admin" 
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ⚙️ Manage Low Stock Thresholds
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
        
        {/* Auto-refresh controls */}
        <AutoRefreshControls 
          queryKey={['lowStock', customerId.toString(), threshold.toString()]} 
          defaultInterval={300000} // 5 minutes default for stock monitoring
          className="bg-white px-4 py-2 rounded-lg shadow"
        />
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Stock Threshold:</label>
          <div className="flex gap-2">
            {[5, 10, 15, 25, 50].map((value) => (
              <button
                key={value}
                onClick={() => handleThresholdChange(value)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  threshold === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">or</span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => handleThresholdChange(parseInt(e.target.value) || 10)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm"
              min="1"
              max="999"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Total Low Stock Items</p>
          <p className="mt-2 text-3xl font-semibold text-red-600">
            {isLoading ? '...' : (lowStockData?.summary?.totalLowStockItems || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Out of Stock</p>
          <p className="mt-2 text-3xl font-semibold text-red-800">
            {isLoading ? '...' : (lowStockData?.summary?.outOfStockItems || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Critical Stock</p>
          <p className="mt-2 text-3xl font-semibold text-orange-600">
            {isLoading ? '...' : (lowStockData?.summary?.criticalItems || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Average Stock Level</p>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {isLoading ? '...' : (lowStockData?.summary?.averageStockLevel || 0).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Low Stock Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Low Stock Items (≤ {threshold} units)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  On Hand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : (lowStockData?.items?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No low stock items found with threshold ≤ {threshold} units
                  </td>
                </tr>
              ) : (
                lowStockData?.items?.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.productName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <div className="font-medium">{item.locationCode}</div>
                        <div className="text-xs text-gray-400">{item.locationName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`font-medium ${item.quantityOnHand <= 0 ? 'text-red-600' : ''}`}>
                        {item.quantityOnHand}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantityAvailable}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantityAllocated}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStockLevelColor(item.stockLevel)}`}>
                        {item.stockLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.updatedAtUtc)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {lowStockData?.pagination && lowStockData.pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((lowStockData.pagination.currentPage - 1) * lowStockData.pagination.pageSize) + 1} to{' '}
              {Math.min(lowStockData.pagination.currentPage * lowStockData.pagination.pageSize, lowStockData.pagination.totalCount)}{' '}
              of {lowStockData.pagination.totalCount} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-md">
                {currentPage} of {lowStockData.pagination.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, lowStockData.pagination.totalPages))}
                disabled={currentPage === lowStockData.pagination.totalPages}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Export Actions */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Export Options</h3>
            <p className="text-xs text-gray-500">Download this report for further analysis</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Export CSV
            </button>
            <button className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700">
              Export Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}