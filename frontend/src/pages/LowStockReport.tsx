import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api/client'

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

  const exportData = (format: 'csv' | 'excel') => {
    if (!lowStockData?.items) return
    
    const headers = ['SKU', 'Product Name', 'Location Code', 'Location Name', 'On Hand', 'Available', 'Allocated', 'Status', 'Last Updated']
    const rows = lowStockData.items.map(item => [
      item.sku,
      item.productName || 'N/A',
      item.locationCode,
      item.locationName,
      item.quantityOnHand,
      item.quantityAvailable,
      item.quantityAllocated,
      item.stockLevel,
      formatDate(item.updatedAtUtc)
    ])
    
    if (format === 'csv') {
      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `low-stock-report-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      // Excel format using tab-separated values
      const excelContent = [headers, ...rows].map(row => row.join('\t')).join('\n')
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `low-stock-report-${new Date().toISOString().split('T')[0]}.xls`
      a.click()
      URL.revokeObjectURL(url)
    }
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
              href="/app/low-stock-admin" 
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ⚙️ Manage Low Stock Thresholds
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
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
            <button 
              onClick={() => exportData('csv')}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Export CSV
            </button>
            <button 
              onClick={() => exportData('excel')}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Out of Stock Section */}
      {(lowStockData?.outOfStockSummary?.totalOutOfStockSkus ?? 0) > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Out of Stock Items</h2>
          
          {/* OOS Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-600">
              <p className="text-sm font-medium text-gray-600">Total Out of Stock</p>
              <p className="mt-2 text-3xl font-semibold text-red-600">
                {lowStockData?.outOfStockSummary?.totalOutOfStockSkus || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">SKUs at zero quantity</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-600">
              <p className="text-sm font-medium text-gray-600">Longest Out of Stock</p>
              <p className="mt-2 text-3xl font-semibold text-orange-600">
                {lowStockData?.outOfStockSummary?.longestOutOfStockDays || 0} days
              </p>
              <p className="mt-1 text-xs text-gray-500">Maximum duration</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-600">
              <p className="text-sm font-medium text-gray-600">Est. Lost Revenue</p>
              <p className="mt-2 text-3xl font-semibold text-amber-600">
                ${(lowStockData?.outOfStockSummary?.totalEstimatedLostRevenue || 0).toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </p>
              <p className="mt-1 text-xs text-gray-500">Based on historical velocity</p>
            </div>
          </div>

          {/* OOS Risk Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-2xl font-bold text-red-600">
                  {lowStockData?.outOfStockSummary?.criticalOosDays || 0}
                </p>
                <p className="text-sm text-red-600">Critical ({'>'}30 days)</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-2xl font-bold text-orange-600">
                  {lowStockData?.outOfStockSummary?.urgentOosDays || 0}
                </p>
                <p className="text-sm text-orange-600">Urgent (14-30 days)</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-2xl font-bold text-yellow-600">
                  {lowStockData?.outOfStockSummary?.recentOosDays || 0}
                </p>
                <p className="text-sm text-yellow-600">Recent ({'<'}14 days)</p>
              </div>
            </div>
          </div>

          {/* OOS Items Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Out of Stock Details
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Days OOS
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Daily Sales Rate
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Est. Lost Revenue
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Top Channel
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : (lowStockData?.outOfStockItems?.length || 0) === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                        No out of stock items
                      </td>
                    </tr>
                  ) : (
                    lowStockData?.outOfStockItems?.map((item: any) => {
                      const getRiskColor = (days: number) => {
                        if (days > 30) return 'bg-red-100 text-red-800'
                        if (days >= 14) return 'bg-orange-100 text-orange-800'
                        return 'bg-yellow-100 text-yellow-800'
                      }

                      return (
                        <tr key={item.sku} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.productName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {item.category || 'Uncategorized'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(item.daysOutOfStock)}`}>
                              {item.daysOutOfStock} days
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                            {item.last30DayVelocity.toFixed(1)} units/day
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                            ${item.estimatedLostRevenue.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {item.topChannel}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}