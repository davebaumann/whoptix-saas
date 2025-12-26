import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Package, AlertCircle } from 'lucide-react'

export default function DemoDashboard() {
  const navigate = useNavigate()
  const [currentReport, setCurrentReport] = useState<'dashboard' | 'inventory' | 'low-stock' | 'aging-inventory' | 'profitability'>('dashboard')
  const [data, setData] = useState<any | null>(null)
  const [inventoryData, setInventoryData] = useState<any | null>(null)
  const [lowStockData, setLowStockData] = useState<any | null>(null)
  const [agingInventoryData, setAgingInventoryData] = useState<any | null>(null)
  const [profitabilityData, setProfitabilityData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('today')
  const [planTier, setPlanTier] = useState<number>(2) // Default to Standard (level 2)
  const [tiers, setTiers] = useState<Array<{ level: number; name: string }>>([])
  const [reportAccess, setReportAccess] = useState<Record<string, number>>({})

  // Report display info with icons
  const reportInfo = {
    'inventory': { label: 'Inventory Report', icon: '📦' },
    'low-stock': { label: 'Low Stock Report', icon: '⚠️' },
    'aging-inventory': { label: 'Aging Inventory', icon: '📅' },
    'profitability': { label: 'Profitability Report', icon: '💹' },
    'demand-forecast': { label: 'Demand Forecast', icon: '🔮' },
    'financial-warehouse': { label: 'Financial Reports', icon: '💰' },
    'locations': { label: 'Location Analysis', icon: '📍' },
    'performance': { label: 'Performance Analytics', icon: '📈' }
  }

  useEffect(() => {
    const fetchAllDemoData = async () => {
      try {
        setLoading(true)
        const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:5239'
        
        // Fetch from demo-specific endpoints (no authentication needed)
        const dashboardResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/dashboard`, {
          headers: { 'Content-Type': 'application/json' }
        })
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json()
          setData(dashboardData)
        }

        const inventoryResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/inventory`, {
          headers: { 'Content-Type': 'application/json' }
        })
        if (inventoryResponse.ok) {
          const invData = await inventoryResponse.json()
          setInventoryData(invData)
        }

        const lowStockResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/low-stock`, {
          headers: { 'Content-Type': 'application/json' }
        })
        if (lowStockResponse.ok) {
          const lsData = await lowStockResponse.json()
          setLowStockData(lsData)
        }

        const agingResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/aging-inventory`, {
          headers: { 'Content-Type': 'application/json' }
        })
        if (agingResponse.ok) {
          const agingData = await agingResponse.json()
          setAgingInventoryData(agingData)
        }

        const profitabilityResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/profitability`, {
          headers: { 'Content-Type': 'application/json' }
        })
        if (profitabilityResponse.ok) {
          const profData = await profitabilityResponse.json()
          setProfitabilityData(profData)
        }

        setError(null)
      } catch (err) {
        console.error('Failed to fetch demo data:', err)
        setError('Unable to load demo data')
      } finally {
        setLoading(false)
      }
    }

    fetchAllDemoData()
  }, [])

  // Load tier configuration and report access from backend
  useEffect(() => {
    // For demo, use hardcoded defaults (demo users aren't authenticated)
    setTiers([
      { level: 2, name: 'Standard' },
      { level: 3, name: 'Premium' },
      { level: 4, name: 'Enterprise' }
    ])
    setReportAccess({
      'inventory': 2,
      'low-stock': 3,
      'aging-inventory': 3,
      'profitability': 3,
      'demand-forecast': 3,
      'financial-warehouse': 4,
      'locations': 4,
      'performance': 4
    })
  }, [])

  // Function to check if a report is available at the current tier level
  const isReportAvailable = (reportKey: string): boolean => {
    const requiredLevel = reportAccess[reportKey]
    const available = requiredLevel ? planTier >= requiredLevel : false
    console.log(`Report: ${reportKey}, Required: ${requiredLevel}, Current Tier: ${planTier}, Available: ${available}`)
    return available
  }

  // Get the data to display (dashboard section uses real API data)
  const displayData = data

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading demo data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/demo')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Demo
        </button>

        {/* Plan Tier Selector */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-4 border border-blue-200">
          <p className="text-sm font-medium text-gray-700 mb-3">Try Different Plan Tiers:</p>
          <div className="flex flex-wrap gap-3">
            {(tiers.length > 0 ? tiers : [
              { level: 2, name: 'Standard' },
              { level: 3, name: 'Premium' },
              { level: 4, name: 'Enterprise' }
            ]).map((tier) => {
              const colors: Record<number, string> = { 2: 'bg-blue-600', 3: 'bg-purple-600', 4: 'bg-amber-600' }
              const lightColors: Record<number, string> = { 2: 'bg-blue-100', 3: 'bg-purple-100', 4: 'bg-amber-100' }
              const textColors: Record<number, string> = { 2: 'text-blue-800', 3: 'text-purple-800', 4: 'text-amber-800' }
              const hoverColors: Record<number, string> = { 2: 'hover:bg-blue-200', 3: 'hover:bg-purple-200', 4: 'hover:bg-amber-200' }
              
              return (
                <button
                  key={tier.level}
                  onClick={() => setPlanTier(tier.level)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                    planTier === tier.level
                      ? `${colors[tier.level]} text-white shadow-lg`
                      : `${lightColors[tier.level]} ${textColors[tier.level]} ${hoverColors[tier.level]}`
                  }`}
                >
                  {tier.name}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-600 mt-3">
            Select a membership tier to see which reports are available
          </p>
        </div>

        {/* Available Reports Navigation */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Available Demo Reports:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCurrentReport('dashboard')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                currentReport === 'dashboard'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📊 Picker Dashboard
            </button>
            {Object.entries(reportInfo).map(([key, { label, icon }]) => {
              const available = isReportAvailable(key)
              return (
                <button
                  key={key}
                  onClick={() => available && setCurrentReport(key as 'dashboard' | 'inventory' | 'low-stock' | 'aging-inventory' | 'profitability')}
                  disabled={!available}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    available
                      ? currentReport === key
                        ? 'bg-green-50 text-green-700 border border-green-200 cursor-pointer'
                        : 'bg-gray-50 text-gray-700 border border-green-200 hover:bg-green-50 cursor-pointer'
                      : 'bg-gray-100 text-gray-600 opacity-50 cursor-not-allowed'
                  }`}
                  title={available ? `View ${label}` : `Upgrade to access (requires level ${reportAccess[key] || 'N/A'})`}
                >
                  {icon} {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Header - Dashboard Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {currentReport === 'dashboard' ? 'Demo Picker Dashboard' : currentReport === 'inventory' ? 'Inventory Report' : currentReport === 'low-stock' ? 'Low Stock Report' : currentReport === 'aging-inventory' ? 'Aging Inventory Report' : 'Profitability Report'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {currentReport === 'dashboard' 
              ? 'Real-time warehouse operations'
              : currentReport === 'inventory'
              ? 'Complete inventory levels and valuations'
              : currentReport === 'low-stock'
              ? 'Items below threshold quantities'
              : currentReport === 'aging-inventory'
              ? 'Slow-moving and aged inventory analysis'
              : 'Product-level profit analysis and margins'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Demo Mode:</strong> {error} - Showing representative sample data from a typical warehouse.
            </p>
          </div>
        )}

        {displayData && currentReport === 'dashboard' ? (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">Date Range:</label>
                <div className="flex gap-2">
                  {['today', 'yesterday', 'last7days'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setDateRange(range)}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        dateRange === range
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {range === 'today' ? 'Today' : range === 'yesterday' ? 'Yesterday' : 'Last 7 Days'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {displayData.kpis.map((kpi: any, idx: number) => (
                <div key={idx} className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">{kpi.label}</h3>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                  </p>
                  <p className={`text-sm font-medium ${kpi.trend && kpi.trend.startsWith('+') ? 'text-green-600' : 'text-gray-600'}`}>
                    {kpi.trend}
                  </p>
                </div>
              ))}
            </div>

            {/* Activity Summary */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-5 sm:p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Activity Summary</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{displayData.activitySummary.totalTransactions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Items Moved</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{displayData.activitySummary.totalQuantity.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg per Transaction</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {Math.round(displayData.activitySummary.totalQuantity / displayData.activitySummary.totalTransactions)}
                    </p>
                  </div>
                </div>

                {/* Transaction Types Breakdown */}
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-4">Transaction Types</p>
                  <div className="space-y-3">
                    {displayData.activitySummary.byType.map((type: any) => (
                      <div key={type.type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">{type.type}</span>
                        <span className="text-sm font-semibold text-gray-900">{type.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-5 sm:p-6 border-b border-gray-200">
                <div className="flex items-center">
                  <Package className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">SKU</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Type</th>
                      <th className="px-6 py-3 text-center font-semibold text-gray-700">Quantity</th>
                      <th className="px-6 py-3 text-left font-semibold text-gray-700">Performed By</th>
                      <th className="px-6 py-3 text-right font-semibold text-gray-700">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayData.recentTransactions.slice(0, 10).map((transaction: any) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-mono text-xs text-gray-900">{transaction.sku}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {transaction.transactionType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium text-gray-900">{transaction.quantity}</td>
                        <td className="px-6 py-4 text-gray-700">{transaction.performedBy}</td>
                        <td className="px-6 py-4 text-right text-gray-500 text-xs">
                          {typeof transaction.transactionDate === 'string' 
                            ? new Date(transaction.transactionDate).toLocaleTimeString()
                            : transaction.transactionDate.toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Try the full version</strong> - This demo showcases the Picker Dashboard with real-time warehouse operations, team performance tracking, and detailed transaction analytics. Upgrade to access advanced features like historical trends, performance benchmarks, and team management.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : currentReport === 'inventory' && inventoryData ? (
          <div className="space-y-6">
            {/* Inventory Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total SKUs</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{inventoryData.totalSkus.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total Quantity</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{inventoryData.totalQuantity.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total Cost Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">${inventoryData.totalCostValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total Retail Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">${inventoryData.totalRetailValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            {/* Stock Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700 font-medium">Low Stock Items</p>
                    <p className="text-3xl font-bold text-orange-900 mt-2">{inventoryData.lowStockCount}</p>
                  </div>
                  <AlertCircle className="w-12 h-12 text-orange-400" />
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 font-medium">Out of Stock</p>
                    <p className="text-3xl font-bold text-red-900 mt-2">{inventoryData.outOfStockCount}</p>
                  </div>
                  <Package className="w-12 h-12 text-red-400" />
                </div>
              </div>
            </div>

            {/* Inventory Items Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Qty</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Cost Value</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Retail Value</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryData.items.map((item: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.sku}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.productName}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.locationName}</td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-700">${item.totalCostValue.toFixed(2)}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-700">${item.totalRetailValue.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center">
                          {item.quantity === 0 ? (
                            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">Out of Stock</span>
                          ) : item.isLowStock ? (
                            <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">Low Stock</span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">In Stock</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Try the full version</strong> - This demo showcases the Inventory Report with complete stock levels, valuations, and low-stock alerts. Upgrade to access advanced features like historical inventory trends, ABC analysis, and automated reorder recommendations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : currentReport === 'inventory' ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">Unable to load inventory data. Please try again later.</p>
          </div>
        ) : currentReport === 'low-stock' && lowStockData ? (
          <div className="space-y-6">
            {/* Low Stock Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
                <p className="text-sm text-gray-600">Total Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{lowStockData.totalLowStockItems}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg shadow border-l-4 border-red-600">
                <p className="text-sm text-red-700 font-medium">Critical (Need Reorder Now)</p>
                <p className="text-2xl font-bold text-red-900 mt-2">{lowStockData.criticalItems}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg shadow border-l-4 border-orange-600">
                <p className="text-sm text-orange-700 font-medium">Urgent (Reorder Soon)</p>
                <p className="text-2xl font-bold text-orange-900 mt-2">{lowStockData.urgentItems}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg shadow border-l-4 border-yellow-600">
                <p className="text-sm text-yellow-700 font-medium">Warning (Monitor)</p>
                <p className="text-2xl font-bold text-yellow-900 mt-2">{lowStockData.warningItems}</p>
              </div>
            </div>

            {/* Low Stock Items Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product Name</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Current</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Threshold</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Variance</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Days Left</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockData.items.map((item: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.sku}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.productName}</td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">{item.currentQty}</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">{item.threshold}</td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-red-600">{item.variance}</td>
                        <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">{item.daysOfSupply}d</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.location}</td>
                        <td className="px-6 py-4 text-center">
                          {item.status === 'critical' ? (
                            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">CRITICAL</span>
                          ) : item.status === 'urgent' ? (
                            <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">URGENT</span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">WARNING</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Try the full version</strong> - This demo showcases the Low Stock Report with real-time inventory monitoring and critical alerts. Upgrade to access automated reorder suggestions, supply forecasting, and integration with your purchasing system.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : currentReport === 'aging-inventory' && agingInventoryData ? (
          <div className="space-y-6">
            {/* Aging Inventory Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                <p className="text-sm text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{agingInventoryData.totalItems}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">${(agingInventoryData.totalValue / 1000).toFixed(1)}k</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-amber-500">
                <p className="text-sm text-gray-600">Average Age</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{agingInventoryData.averageAge}d</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
                <p className="text-sm text-gray-600">Oldest Item</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{agingInventoryData.oldestItem}d</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-orange-500">
                <p className="text-sm text-gray-600">Over 180 Days</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{agingInventoryData.itemsOver180Days}</p>
              </div>
            </div>

            {/* Age Bracket Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-xs text-green-700 font-semibold">0-30 Days</p>
                <p className="text-lg font-bold text-green-900 mt-1">{agingInventoryData.items.filter((i: any) => i.daysInInventory <= 30).length}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-700 font-semibold">30-60 Days</p>
                <p className="text-lg font-bold text-blue-900 mt-1">{agingInventoryData.items.filter((i: any) => i.daysInInventory > 30 && i.daysInInventory <= 60).length}</p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg text-center">
                <p className="text-xs text-yellow-700 font-semibold">60-90 Days</p>
                <p className="text-lg font-bold text-yellow-900 mt-1">{agingInventoryData.items.filter((i: any) => i.daysInInventory > 60 && i.daysInInventory <= 90).length}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <p className="text-xs text-orange-700 font-semibold">90-180 Days</p>
                <p className="text-lg font-bold text-orange-900 mt-1">{agingInventoryData.items.filter((i: any) => i.daysInInventory > 90 && i.daysInInventory <= 180).length}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-center">
                <p className="text-xs text-red-700 font-semibold">180+ Days</p>
                <p className="text-lg font-bold text-red-900 mt-1">{agingInventoryData.items.filter((i: any) => i.daysInInventory > 180).length}</p>
              </div>
            </div>

            {/* Aging Inventory Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">SKU</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product Name</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Days in Inventory</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Quantity</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Cost Value</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Sale Date</th>
                      <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Age Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingInventoryData.items.map((item: any, idx: number) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.sku}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">{item.productName}</td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">{item.daysInInventory}d</td>
                        <td className="px-6 py-4 text-center text-sm text-gray-600">{item.quantity}</td>
                        <td className="px-6 py-4 text-right text-sm text-gray-700">${item.costValue.toFixed(2)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.location}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{item.lastSaleDate}</td>
                        <td className="px-6 py-4 text-center">
                          {item.ageGroup === '0-30 days' && (
                            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">FRESH</span>
                          )}
                          {item.ageGroup === '30-60 days' && (
                            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">AGING</span>
                          )}
                          {item.ageGroup === '60-90 days' && (
                            <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">OLD</span>
                          )}
                          {item.ageGroup === '90-180 days' && (
                            <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">VERY OLD</span>
                          )}
                          {item.ageGroup === 'Over 180 days' && (
                            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded">OBSOLETE</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800">
                    <strong>Try the full version</strong> - This demo showcases the Aging Inventory Report with detailed analysis of slow-moving and obsolete stock. Upgrade to access markdown suggestions, liquidation planning, ABC-XYZ analysis, and automated reorder optimization.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : currentReport === 'low-stock' ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">Unable to load low stock data. Please try again later.</p>
          </div>
        ) : currentReport === 'aging-inventory' ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">Unable to load aging inventory data. Please try again later.</p>
          </div>
        ) : currentReport === 'profitability' ? (
          <div className="bg-white rounded-lg shadow p-6">
            {profitabilityData ? (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-900">${(profitabilityData.totalRevenue || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Cost</p>
                    <p className="text-2xl font-bold text-blue-900">${(profitabilityData.totalCost || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Gross Profit</p>
                    <p className="text-2xl font-bold text-green-900">${(profitabilityData.totalGrossProfit || 0).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Avg Margin</p>
                    <p className="text-2xl font-bold text-blue-900">{(profitabilityData.avgMarginPercent || 0).toFixed(1)}%</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">Units Sold</p>
                    <p className="text-2xl font-bold text-blue-900">{(profitabilityData.totalUnitsSold || 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* Margin Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                    <p className="text-sm font-medium text-gray-600">High Margin (&gt;30%)</p>
                    <p className="text-2xl font-bold text-green-700 mt-2">{profitabilityData.highMarginCount || 0}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                    <p className="text-sm font-medium text-gray-600">Medium Margin (10-30%)</p>
                    <p className="text-2xl font-bold text-blue-700 mt-2">{profitabilityData.mediumMarginCount || 0}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                    <p className="text-sm font-medium text-gray-600">Low Margin (0-10%)</p>
                    <p className="text-2xl font-bold text-yellow-700 mt-2">{profitabilityData.lowMarginCount || 0}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                    <p className="text-sm font-medium text-gray-600">Unprofitable (&lt;0%)</p>
                    <p className="text-2xl font-bold text-red-700 mt-2">{profitabilityData.unprofitableCount || 0}</p>
                  </div>
                </div>

                {/* Products Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b">
                    <h3 className="font-semibold text-gray-900">Top Profitable Products</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left font-medium text-gray-700">SKU</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-700">Product</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-700">Units Sold</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-700">Revenue</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-700">Gross Profit</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-700">Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(profitabilityData.items || []).slice(0, 5).map((item: any) => (
                          <tr key={item.sku} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs text-gray-900">{item.sku}</td>
                            <td className="px-6 py-4 text-gray-700">{item.productName}</td>
                            <td className="px-6 py-4 text-right text-gray-900">{item.unitsSold}</td>
                            <td className="px-6 py-4 text-right text-gray-900">${item.revenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td className="px-6 py-4 text-right font-medium text-green-600">${item.grossProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {item.marginPercent.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-800">
                        <strong>Premium Feature:</strong> This demo shows profit analysis by product, identifying your most profitable SKUs and those with margin opportunities. Get real-time insights into revenue, cost structure, and profitability metrics to optimize product mix and pricing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading profitability data...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">Unable to load demo data. Please try again later.</p>
          </div>
        )}
      </div>
    </div>
  )
}
