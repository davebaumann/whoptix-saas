import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import AutoRefreshControls from '../components/AutoRefreshControls'

interface LocationAnalytic {
  locationId: number
  locationCode: string
  locationName: string
  warehouse: string
  totalSkus: number
  totalQuantity: number
  totalCostValue: number
  totalRetailValue: number
  averageQuantityPerSku: number
  lowStockItems: number
  utilizationScore: number
}

interface WarehouseSummary {
  warehouseName: string
  locationCount: number
  totalSkus: number
  totalQuantity: number
  totalCostValue: number
  totalRetailValue: number
  averageUtilization: number
}

interface LocationReportSummary {
  totalLocations: number
  totalWarehouses: number
  totalSkus: number
  totalQuantity: number
  totalCostValue: number
  totalRetailValue: number
  averageUtilization: number
  topLocation: string
  lowStockLocations: number
}

interface LocationReportResponse {
  summary: LocationReportSummary
  warehouses: WarehouseSummary[]
  locations: LocationAnalytic[]
}

export default function Locations() {
  const { user, isLoading: authLoading } = useAuth()
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all')
  const [sortField, setSortField] = useState<keyof LocationAnalytic>('totalCostValue')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

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

  const { data: locationsData, isLoading } = useQuery<LocationReportResponse>({
    queryKey: ['locationsReport', customerId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/customer/${customerId}/locations`, {
        credentials: 'include'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch locations report')
      }
      return response.json()
    },
  })

  const handleSort = (field: keyof LocationAnalytic) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const getSortedData = () => {
    if (!locationsData) return []
    
    let filtered = locationsData.locations
    if (selectedWarehouse !== 'all') {
      filtered = filtered.filter(loc => loc.warehouse === selectedWarehouse)
    }
    
    return [...filtered].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }
      
      return sortDirection === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue)
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  const getUtilizationColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading locations data...</p>
        </div>
      </div>
    )
  }

  if (!locationsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No location data available.</p>
      </div>
    )
  }

  const sortedData = getSortedData()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations Report</h1>
          <p className="mt-1 text-sm text-gray-600">
            Analyze warehouse organization, location utilization, and inventory distribution
          </p>
        </div>
        
        {/* Auto-refresh controls */}
        <AutoRefreshControls 
          queryKey={['locationsReport', customerId.toString()]} 
          defaultInterval={600000} // 10 minutes default
          className="bg-white px-4 py-2 rounded-lg shadow"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">📍</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Locations</p>
              <p className="text-2xl font-bold text-gray-900">{locationsData.summary.totalLocations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">🏢</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Warehouses</p>
              <p className="text-2xl font-bold text-gray-900">{locationsData.summary.totalWarehouses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">📦</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Inventory</p>
              <p className="text-2xl font-bold text-gray-900">{locationsData.summary.totalQuantity.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">💰</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(locationsData.summary.totalRetailValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">⚡</div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
              <p className="text-2xl font-bold text-gray-900">{locationsData.summary.averageUtilization.toFixed(0)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Warehouse Overview */}
      {locationsData.warehouses.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Warehouse Overview</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Locations</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKUs</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilization</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {locationsData.warehouses.map((warehouse, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {warehouse.warehouseName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {warehouse.locationCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {warehouse.totalSkus.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {warehouse.totalQuantity.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(warehouse.totalRetailValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUtilizationColor(warehouse.averageUtilization)}`}>
                        {warehouse.averageUtilization.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Filter by Warehouse:</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Warehouses</option>
            {locationsData.warehouses.map((warehouse) => (
              <option key={warehouse.warehouseName} value={warehouse.warehouseName}>
                {warehouse.warehouseName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Location Details */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Location Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('locationCode')}
                >
                  Location {sortField === 'locationCode' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('warehouse')}
                >
                  Warehouse {sortField === 'warehouse' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalSkus')}
                >
                  SKUs {sortField === 'totalSkus' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalQuantity')}
                >
                  Quantity {sortField === 'totalQuantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalCostValue')}
                >
                  Cost Value {sortField === 'totalCostValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalRetailValue')}
                >
                  Retail Value {sortField === 'totalRetailValue' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('lowStockItems')}
                >
                  Low Stock {sortField === 'lowStockItems' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('utilizationScore')}
                >
                  Utilization {sortField === 'utilizationScore' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((location) => (
                <tr key={location.locationId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{location.locationCode}</div>
                      <div className="text-sm text-gray-500">{location.locationName}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {location.warehouse}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {location.totalSkus}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {location.totalQuantity.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(location.totalCostValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(location.totalRetailValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {location.lowStockItems > 0 ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-600">
                        {location.lowStockItems} items
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUtilizationColor(location.utilizationScore)}`}>
                      {location.utilizationScore.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedData.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No locations found for the selected warehouse.</p>
        </div>
      )}
    </div>
  )
}
