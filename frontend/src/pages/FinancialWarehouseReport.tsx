import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import AutoRefreshControls from '../components/AutoRefreshControls'

interface FinancialWarehouseItem {
  sku: string
  productName: string
  warehouse: string
  location: string
  quantity: number
  cost: number
  price: number
  totalCostValue: number
  totalRetailValue: number
}

interface WarehouseBreakdown {
  warehouse: string
  totalQuantity: number
  totalCostValue: number
  totalRetailValue: number
  uniqueSkus: number
}

interface FinancialWarehouseSummary {
  period: string
  reportDate: string
  totalSkus: number
  totalQuantity: number
  totalCostValue: number
  totalRetailValue: number
  potentialProfit: number
  averageCostPerUnit: number
  averageRetailPerUnit: number
  warehouseBreakdowns: WarehouseBreakdown[]
}

interface FinancialWarehouseResponse {
  summary: FinancialWarehouseSummary
  details: FinancialWarehouseItem[]
}

export default function FinancialWarehouseReport() {
  const { user, isLoading: authLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState(1)
  const [period, setPeriod] = useState('current')
  const [sortField, setSortField] = useState<keyof FinancialWarehouseItem>('totalCostValue')
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

  // Check authentication
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Authentication required.</p>
        </div>
      </div>
    )
  }

  const customerId = user.customerId || 1

  const { data: financialData, isLoading } = useQuery<FinancialWarehouseResponse>({
    queryKey: ['financialWarehouseReport', customerId, period],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/customer/${customerId}/financial-warehouse?period=${period}`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch financial warehouse report')
      }
      return response.json()
    },
  })

  const handleSort = (field: keyof FinancialWarehouseItem) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
    setCurrentPage(1)
  }

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod)
    setCurrentPage(1)
  }

  const getSortedData = () => {
    if (!financialData) return []
    
    const sorted = [...financialData.details].sort((a, b) => {
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
  const totalPages = Math.ceil((financialData?.details.length || 0) / pageSize)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getMarginColor = (cost: number, price: number): string => {
    if (cost === 0 || price === 0) return 'text-gray-600'
    const marginPercent = ((price - cost) / price) * 100
    if (marginPercent >= 50) return 'text-green-600'
    if (marginPercent >= 30) return 'text-blue-600'
    if (marginPercent >= 15) return 'text-yellow-600'
    return 'text-red-600'
  }

  const calculateMargin = (cost: number, price: number): string => {
    if (cost === 0 || price === 0) return 'N/A'
    const marginPercent = ((price - cost) / price) * 100
    return marginPercent.toFixed(1) + '%'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Warehouse Report</h1>
          <p className="mt-1 text-sm text-gray-600">
            Comprehensive financial valuation of warehouse inventory
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Auto-refresh controls */}
          <AutoRefreshControls 
            queryKey={['financialWarehouseReport', customerId.toString(), period]} 
            defaultInterval={600000} // 10 minutes default for financial data
            className="bg-white px-3 py-2 rounded-md border border-gray-300"
          />
          
          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="current">Current Snapshot</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : financialData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Inventory Value (Cost)</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(financialData.summary.totalCostValue)}</p>
              <p className="text-xs text-gray-500 mt-1">{financialData.summary.totalSkus} SKUs</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Retail Value</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(financialData.summary.totalRetailValue)}</p>
              <p className="text-xs text-gray-500 mt-1">{financialData.summary.totalQuantity} units</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Potential Profit</h3>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(financialData.summary.potentialProfit)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {((financialData.summary.potentialProfit / financialData.summary.totalRetailValue) * 100).toFixed(1)}% margin
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Avg Cost Per Unit</h3>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(financialData.summary.averageCostPerUnit)}</p>
              <p className="text-xs text-gray-500 mt-1">Retail: {formatCurrency(financialData.summary.averageRetailPerUnit)}</p>
            </div>
          </div>

          {/* Period Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700">
              Report Period: {financialData.summary.period} • 
              Generated on {formatDate(financialData.summary.reportDate)}
            </p>
          </div>

          {/* Warehouse Breakdowns */}
          {financialData.summary.warehouseBreakdowns.length > 1 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Warehouse Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Warehouse
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKUs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Retail Value
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {financialData.summary.warehouseBreakdowns.map((warehouse, index) => (
                      <tr key={warehouse.warehouse} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {warehouse.warehouse}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {warehouse.uniqueSkus}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {warehouse.totalQuantity.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                          {formatCurrency(warehouse.totalCostValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          {formatCurrency(warehouse.totalRetailValue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Detailed Inventory Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Detailed Inventory Valuation</h3>
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
                      onClick={() => handleSort('productName')}
                    >
                      Product {sortField === 'productName' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('warehouse')}
                    >
                      Warehouse {sortField === 'warehouse' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('quantity')}
                    >
                      Quantity {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('cost')}
                    >
                      Unit Cost {sortField === 'cost' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('totalCostValue')}
                    >
                      Total Cost {sortField === 'totalCostValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('totalRetailValue')}
                    >
                      Total Retail {sortField === 'totalRetailValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedData.map((item, index) => (
                    <tr key={`${item.sku}-${item.location}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.warehouse}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.cost || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                        {formatCurrency(item.totalCostValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(item.totalRetailValue)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getMarginColor(item.cost || 0, item.price || 0)}`}>
                        {calculateMargin(item.cost || 0, item.price || 0)}
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
                      <span className="font-medium">{Math.min(currentPage * pageSize, financialData.details.length)}</span> of{' '}
                      <span className="font-medium">{financialData.details.length}</span> results
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
          <p className="text-gray-500">No financial data available</p>
        </div>
      )}
    </div>
  )
}