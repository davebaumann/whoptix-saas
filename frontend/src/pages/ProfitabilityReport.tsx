import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, DollarSign, AlertCircle, Info, ChevronDown } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import WithMembershipCheck from '../components/WithMembershipCheck'
import { format, subDays } from 'date-fns'

interface Tooltip {
  [key: string]: string
}

const METRIC_TOOLTIPS: Tooltip = {
  totalRevenue: 'Sum of all sales revenue (Units Sold × Sale Price)',
  totalCost: 'Sum of all product costs (Units Sold × Cost per Unit)',
  grossProfit: 'Total Revenue minus Total Cost',
  avgMargin: 'Average profit margin across all products sold = (Gross Profit / Total Revenue) × 100%',
  unitsSold: 'Total number of units sold across all SKUs',
  highMargin: 'Products with profit margin greater than 30%',
  mediumMargin: 'Products with profit margin between 10% and 30%',
  lowMargin: 'Products with profit margin between 0% and 10%',
  unprofitable: 'Products with negative profit margin (cost exceeds sale price)'
}

interface ProfitabilityItem {
  sku: string
  productName: string
  unitsSold: number
  cost: number
  salePrice: number
  totalRevenue: number
  totalCost: number
  grossProfit: number
  profitMargin: number
  currentStock: number
  category: string
}

interface ProfitabilitySummary {
  totalSkus: number
  totalUnitsSold: number
  totalRevenue: number
  totalCost: number
  totalGrossProfit: number
  averageProfitMargin: number
  highMarginSkus: number
  mediumMarginSkus: number
  lowMarginSkus: number
  unprofitableSkus: number
  items: ProfitabilityItem[]
}

interface ProfitabilityResponse {
  summary: ProfitabilitySummary
  topProfitable: ProfitabilityItem[]
  bottomProfitable: ProfitabilityItem[]
}

const SAMPLE_PROFITABILITY_DATA: ProfitabilityResponse = {
  summary: {
    totalSkus: 8,
    totalUnitsSold: 892,
    totalRevenue: 23847.50,
    totalCost: 10284.50,
    totalGrossProfit: 13563.00,
    averageProfitMargin: 56.8,
    highMarginSkus: 5,
    mediumMarginSkus: 2,
    lowMarginSkus: 1,
    unprofitableSkus: 0,
    items: [
      { sku: '2023-DD-Harness-Black-Small', productName: 'Dog Harness - Black Small', unitsSold: 284, cost: 3.32, salePrice: 24.99, totalRevenue: 7087.16, totalCost: 941.88, grossProfit: 6145.28, profitMargin: 86.7, currentStock: 145, category: 'Harnesses' },
      { sku: '2023-DD-Bed-Orthopedic-Large', productName: 'Orthopedic Dog Bed - Large', unitsSold: 128, cost: 35.00, salePrice: 89.99, totalRevenue: 11518.72, totalCost: 4480.00, grossProfit: 7038.72, profitMargin: 61.1, currentStock: 28, category: 'Beds' },
      { sku: '2023-DD-Harness-Black-Medium', productName: 'Dog Harness - Black Medium', unitsSold: 156, cost: 4.20, salePrice: 26.99, totalRevenue: 4210.44, totalCost: 655.20, grossProfit: 3555.24, profitMargin: 84.4, currentStock: 89, category: 'Harnesses' },
      { sku: '2023-DD-Leash-Black-Standard', productName: 'Dog Leash - Black Standard', unitsSold: 142, cost: 3.50, salePrice: 9.99, totalRevenue: 1418.58, totalCost: 497.00, grossProfit: 921.58, profitMargin: 65.0, currentStock: 267, category: 'Leashes' },
      { sku: '2023-DD-Collar-Blue-Small', productName: 'Dog Collar - Blue Small', unitsSold: 87, cost: 4.20, salePrice: 12.99, totalRevenue: 1130.13, totalCost: 365.40, grossProfit: 764.73, profitMargin: 67.7, currentStock: 5, category: 'Collars' },
      { sku: '2023-DD-Toy-Kong-Medium', productName: 'Kong Toy - Medium', unitsSold: 65, cost: 2.50, salePrice: 8.99, totalRevenue: 584.35, totalCost: 162.50, grossProfit: 421.85, profitMargin: 72.2, currentStock: 23, category: 'Toys' },
      { sku: '2023-DD-Treat-Dental-Stick', productName: 'Dental Treat Sticks', unitsSold: 145, cost: 1.25, salePrice: 3.99, totalRevenue: 578.55, totalCost: 181.25, grossProfit: 397.30, profitMargin: 68.7, currentStock: 412, category: 'Treats' },
      { sku: '2023-DD-Toy-Rubber-Ball', productName: 'Rubber Ball Toy', unitsSold: 45, cost: 0.75, salePrice: 2.49, totalRevenue: 111.05, totalCost: 33.75, grossProfit: 77.30, profitMargin: 69.6, currentStock: 78, category: 'Toys' }
    ]
  },
  topProfitable: [
    { sku: '2023-DD-Harness-Black-Small', productName: 'Dog Harness - Black Small', unitsSold: 284, cost: 3.32, salePrice: 24.99, totalRevenue: 7087.16, totalCost: 941.88, grossProfit: 6145.28, profitMargin: 86.7, currentStock: 145, category: 'Harnesses' },
    { sku: '2023-DD-Harness-Black-Medium', productName: 'Dog Harness - Black Medium', unitsSold: 156, cost: 4.20, salePrice: 26.99, totalRevenue: 4210.44, totalCost: 655.20, grossProfit: 3555.24, profitMargin: 84.4, currentStock: 89, category: 'Harnesses' },
    { sku: '2023-DD-Toy-Kong-Medium', productName: 'Kong Toy - Medium', unitsSold: 65, cost: 2.50, salePrice: 8.99, totalRevenue: 584.35, totalCost: 162.50, grossProfit: 421.85, profitMargin: 72.2, currentStock: 23, category: 'Toys' },
    { sku: '2023-DD-Treat-Dental-Stick', productName: 'Dental Treat Sticks', unitsSold: 145, cost: 1.25, salePrice: 3.99, totalRevenue: 578.55, totalCost: 181.25, grossProfit: 397.30, profitMargin: 68.7, currentStock: 412, category: 'Treats' },
    { sku: '2023-DD-Collar-Blue-Small', productName: 'Dog Collar - Blue Small', unitsSold: 87, cost: 4.20, salePrice: 12.99, totalRevenue: 1130.13, totalCost: 365.40, grossProfit: 764.73, profitMargin: 67.7, currentStock: 5, category: 'Collars' }
  ],
  bottomProfitable: [
    { sku: '2023-DD-Toy-Rubber-Ball', productName: 'Rubber Ball Toy', unitsSold: 45, cost: 0.75, salePrice: 2.49, totalRevenue: 111.05, totalCost: 33.75, grossProfit: 77.30, profitMargin: 69.6, currentStock: 78, category: 'Toys' },
    { sku: '2023-DD-Leash-Black-Standard', productName: 'Dog Leash - Black Standard', unitsSold: 142, cost: 3.50, salePrice: 9.99, totalRevenue: 1418.58, totalCost: 497.00, grossProfit: 921.58, profitMargin: 65.0, currentStock: 267, category: 'Leashes' },
    { sku: '2023-DD-Treat-Dental-Stick', productName: 'Dental Treat Sticks', unitsSold: 145, cost: 1.25, salePrice: 3.99, totalRevenue: 578.55, totalCost: 181.25, grossProfit: 397.30, profitMargin: 68.7, currentStock: 412, category: 'Treats' },
    { sku: '2023-DD-Toy-Kong-Medium', productName: 'Kong Toy - Medium', unitsSold: 65, cost: 2.50, salePrice: 8.99, totalRevenue: 584.35, totalCost: 162.50, grossProfit: 421.85, profitMargin: 72.2, currentStock: 23, category: 'Toys' },
    { sku: '2023-DD-Collar-Blue-Small', productName: 'Dog Collar - Blue Small', unitsSold: 87, cost: 4.20, salePrice: 12.99, totalRevenue: 1130.13, totalCost: 365.40, grossProfit: 764.73, profitMargin: 67.7, currentStock: 5, category: 'Collars' }
  ]
}

export default function ProfitabilityReport() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // Check if admin is viewing as another customer
  const adminViewingData = sessionStorage.getItem('adminViewingAs');
  const adminViewingCustomerId = adminViewingData ? JSON.parse(adminViewingData).customerId : null;
  
  // Use impersonated customer ID if admin is viewing as, otherwise use user's own customer ID
  const customerId = adminViewingCustomerId || user?.customerId || 1
  const [data, setData] = useState<ProfitabilityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'margin' | 'profit' | 'revenue' | 'unitsSold'>('margin')
  const [dateRange, setDateRange] = useState<'month' | '90day' | 'all'>('month')
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

  useEffect(() => {
    const fetchProfitabilityData = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:5239'
        
        // Calculate date range
        let from: string | undefined
        let to: string | undefined
        
        const now = new Date()
        switch (dateRange) {
          case 'month':
            from = format(subDays(now, 30), 'yyyy-MM-dd') + 'T00:00:00Z'
            to = format(now, 'yyyy-MM-dd') + 'T23:59:59Z'
            break
          case '90day':
            from = format(subDays(now, 90), 'yyyy-MM-dd') + 'T00:00:00Z'
            to = format(now, 'yyyy-MM-dd') + 'T23:59:59Z'
            break
          case 'all':
            // No date params for all-time
            break
        }
        
        const url = new URL(`${baseUrl}/api/reports/customer/${customerId}/profitability`)
        if (from) url.searchParams.append('from', from)
        if (to) url.searchParams.append('to', to)
        
        const response = await fetch(url.toString(), {
          credentials: 'include'
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch profitability data: ${response.statusText}`)
        }

        const profitabilityData = await response.json()
        
        // If no items, show sample data
        if (!profitabilityData.summary.items || profitabilityData.summary.items.length === 0) {
          setData(SAMPLE_PROFITABILITY_DATA)
          setError('No sales data available. Showing sample data.')
        } else {
          setData(profitabilityData)
          setError(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profitability report')
        setData(SAMPLE_PROFITABILITY_DATA)
        console.error('Error fetching profitability data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (customerId) {
      setLoading(true)
      fetchProfitabilityData()
    }
  }, [customerId, dateRange])

  const getSortedItems = () => {
    if (!data?.summary.items) return []
    const items = [...data.summary.items]
    switch (sortBy) {
      case 'margin':
        return items.sort((a, b) => b.profitMargin - a.profitMargin)
      case 'profit':
        return items.sort((a, b) => b.grossProfit - a.grossProfit)
      case 'revenue':
        return items.sort((a, b) => b.totalRevenue - a.totalRevenue)
      case 'unitsSold':
        return items.sort((a, b) => b.unitsSold - a.unitsSold)
      default:
        return items
    }
  }

  const getMarginColor = (margin: number) => {
    if (margin > 30) return 'bg-green-100 text-green-800'
    if (margin > 10) return 'bg-blue-100 text-blue-800'
    if (margin > 0) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getMarginBorder = (margin: number) => {
    if (margin > 30) return 'border-l-4 border-green-500'
    if (margin > 10) return 'border-l-4 border-blue-500'
    if (margin > 0) return 'border-l-4 border-yellow-500'
    return 'border-l-4 border-red-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading profitability report...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('/app/reports')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </button>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <div>
                <h3 className="font-semibold text-red-800">Error</h3>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">No data available</div>
      </div>
    )
  }

  const summary = data.summary
  const sortedItems = getSortedItems()

  return (
    <WithMembershipCheck reportName="profitability" reportDisplayName="Profitability Report">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate('/app/reports')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Reports
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Profitability Analysis</h1>
            <p className="mt-2 text-gray-600">
              Revenue, cost, and margin analysis by product
            </p>
          </div>

          {/* Date Range Selector */}
          <div className="mb-8 flex gap-2">
            <button
              onClick={() => setDateRange('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange('90day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === '90day'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Last 90 Days
            </button>
            <button
              onClick={() => setDateRange('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Time
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                {renderTooltip('totalRevenue')}
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ${summary.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Total Cost</p>
                {renderTooltip('totalCost')}
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ${summary.totalCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Gross Profit</p>
                {renderTooltip('grossProfit')}
              </div>
              <p className="text-3xl font-bold text-green-600">
                ${summary.totalGrossProfit.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Avg Margin</p>
                {renderTooltip('avgMargin')}
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {summary.averageProfitMargin.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">Units Sold</p>
                {renderTooltip('unitsSold')}
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {summary.totalUnitsSold.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Margin Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-green-50 rounded-lg border border-green-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">High Margin</p>
                {renderTooltip('highMargin')}
              </div>
              <p className="text-2xl font-bold text-green-700 mt-2">{summary.highMarginSkus}</p>
              <p className="text-xs text-gray-500 mt-1">&gt; 30% margin</p>
            </div>

            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Medium Margin</p>
                {renderTooltip('mediumMargin')}
              </div>
              <p className="text-2xl font-bold text-blue-700 mt-2">{summary.mediumMarginSkus}</p>
              <p className="text-xs text-gray-500 mt-1">10-30% margin</p>
            </div>

            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Low Margin</p>
                {renderTooltip('lowMargin')}
              </div>
              <p className="text-2xl font-bold text-yellow-700 mt-2">{summary.lowMarginSkus}</p>
              <p className="text-xs text-gray-500 mt-1">0-10% margin</p>
            </div>

            <div className="bg-red-50 rounded-lg border border-red-200 p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Unprofitable</p>
                {renderTooltip('unprofitable')}
              </div>
              <p className="text-2xl font-bold text-red-700 mt-2">{summary.unprofitableSkus}</p>
              <p className="text-xs text-gray-500 mt-1">&lt; 0% margin</p>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <DollarSign className="w-5 h-5 text-blue-600 mr-2" />
                  Product Profitability
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSortBy('margin')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      sortBy === 'margin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Margin
                  </button>
                  <button
                    onClick={() => setSortBy('profit')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      sortBy === 'profit'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Profit
                  </button>
                  <button
                    onClick={() => setSortBy('revenue')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      sortBy === 'revenue'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setSortBy('unitsSold')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      sortBy === 'unitsSold'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Units Sold
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 max-w-32">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setSortBy('unitsSold')}>
                      <div className="flex items-center justify-end gap-1">
                        Units Sold
                        {sortBy === 'unitsSold' && <ChevronDown className="w-4 h-4" />}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost/Unit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Sale Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setSortBy('revenue')}>
                      <div className="flex items-center justify-end gap-1">
                        Revenue
                        {sortBy === 'revenue' && <ChevronDown className="w-4 h-4" />}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setSortBy('profit')}>
                      <div className="flex items-center justify-end gap-1">
                        Gross Profit
                        {sortBy === 'profit' && <ChevronDown className="w-4 h-4" />}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setSortBy('margin')}>
                      <div className="flex items-center justify-end gap-1">
                        Margin %
                        {sortBy === 'margin' && <ChevronDown className="w-4 h-4" />}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedItems.map((item) => (
                    <tr key={item.sku} className={`hover:bg-gray-50 ${getMarginBorder(item.profitMargin)}`}>
                      <td className="px-6 py-4 text-sm font-mono text-gray-900 w-32 max-w-32 truncate" title={item.sku}>{item.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{item.productName}</div>
                        <div className="text-xs text-gray-500">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.unitsSold.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        ${item.cost.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        ${item.salePrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        ${item.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                        item.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${item.grossProfit.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getMarginColor(item.profitMargin)}`}>
                          {item.profitMargin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {item.currentStock.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
              Showing {sortedItems.length} products
            </div>
          </div>
        </div>
      </div>
    </WithMembershipCheck>
  )
}
