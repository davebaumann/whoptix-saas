import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { Download, Info } from 'lucide-react'

interface Tooltip {
  [key: string]: string
}

const METRIC_TOOLTIPS: Tooltip = {
  utilizationScore: 'Utilization Score = (SKU Diversity × 40%) + (Quantity Volume × 30%) + (Cost Value × 30%). Diversity: SKU Count / 10 (max 40pts). Quantity: Total Qty / 100 (max 30pts). Value: Total Cost / $10,000 (max 30pts). Maximum score: 100%.',
  averageUtilization: 'Average utilization score across all locations in the warehouse'
}

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
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)

  const renderTooltip = (key: string) => (
    <div className="relative group inline-block">
      <Info 
        className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
        onMouseEnter={() => setHoveredTooltip(key)}
        onMouseLeave={() => setHoveredTooltip(null)}
      />
      {hoveredTooltip === key && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded p-2 z-10 pointer-events-none">
          {METRIC_TOOLTIPS[key]}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  )

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

  // Check if admin is viewing as another customer
  const adminViewingData = sessionStorage.getItem('adminViewingAs');
  const adminViewingCustomerId = adminViewingData ? JSON.parse(adminViewingData).customerId : null;
  
  // Use impersonated customer ID if admin is viewing as, otherwise use user's own customer ID
  const customerId = adminViewingCustomerId || user.customerId || 1

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getUtilizationColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    if (score >= 40) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const exportToCSV = () => {
    if (!locationsData) return

    const rows: string[] = []
    
    // Header row
    rows.push('Location Code,Location Name,Warehouse,Total SKUs,Total Quantity,Total Cost Value,Total Retail Value,Avg Quantity Per SKU,Low Stock Items,Utilization Score %')
    
    // Data rows - use sorted and filtered locations
    getSortedData().forEach((location: LocationAnalytic) => {
      rows.push(
        `"${location.locationCode}","${location.locationName}","${location.warehouse}",${location.totalSkus},${location.totalQuantity},${location.totalCostValue.toFixed(2)},${location.totalRetailValue.toFixed(2)},${location.averageQuantityPerSku.toFixed(2)},${location.lowStockItems},${location.utilizationScore.toFixed(2)}`
      )
    })
    
    // Create blob and download
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `location-details-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
            <div className="ml-4 min-w-0">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 truncate">{formatCurrency(locationsData.summary.totalRetailValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="text-2xl">⚡</div>
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-600">Avg Utilization</p>
                {renderTooltip('averageUtilization')}
              </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">Utilization {renderTooltip('averageUtilization')}</th>
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
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Location Details</h3>
          <button
            onClick={exportToCSV}
            disabled={!locationsData || locationsData.locations.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
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
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 flex items-center gap-1"
                  onClick={() => handleSort('utilizationScore')}
                >
                  <span>Utilization {sortField === 'utilizationScore' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                  {renderTooltip('utilizationScore')}
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
