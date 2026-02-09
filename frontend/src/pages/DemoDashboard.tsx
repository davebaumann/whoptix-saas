import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Package, AlertCircle } from 'lucide-react'
import DemoAgingInventoryReport from './DemoAgingInventoryReport'

export default function DemoDashboard() {
  const navigate = useNavigate()
  const [currentReport, setCurrentReport] = useState<'dashboard' | 'inventory' | 'low-stock' | 'aging-inventory' | 'profitability' | 'demand-forecast' | 'financial-warehouse' | 'locations' | 'performance-metrics' | 'channel-performance'>('dashboard')
  const [data, setData] = useState<any | null>(null)
  const [topPerformers, setTopPerformers] = useState<any | null>(null)
  const [inventoryData, setInventoryData] = useState<any | null>(null)
  const [lowStockData, setLowStockData] = useState<any | null>(null)
  const [agingInventoryData, setAgingInventoryData] = useState<any | null>(null)
  const [profitabilityData, setProfitabilityData] = useState<any | null>(null)
  const [demandForecastData, setDemandForecastData] = useState<any | null>(null)
  const [financialData, setFinancialData] = useState<any | null>(null)
  const [locationData, setLocationData] = useState<any | null>(null)
  const [performanceMetricsData, setPerformanceMetricsData] = useState<any | null>(null)
  const [channelRevenueData, setChannelRevenueData] = useState<any | null>(null)
  const [channelTopSkusData, setChannelTopSkusData] = useState<any | null>(null)
  const [channelTrendsData, setChannelTrendsData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('today')
  const [forecastPeriod, setForecastPeriod] = useState('30days')
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
    'performance-metrics': { label: 'Performance Metrics', icon: '📈' },
    'channel-performance': { label: 'Channel Performance', icon: '🌐' }
  }

  useEffect(() => {
    const fetchDemoData = async () => {
      try {
        setLoading(true)
        const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || 'http://localhost:5239'
        
        // Only fetch data for the currently selected report
        switch (currentReport) {
          case 'dashboard':
            // Fetch dashboard and top performers
            const dashboardResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/dashboard?dateRange=${dateRange}`, {
              headers: { 'Content-Type': 'application/json' }
            })
            if (dashboardResponse.ok) {
              const dashboardData = await dashboardResponse.json()
              console.log('Dashboard data loaded:', dashboardData)
              setData(dashboardData)
            }

            const topPerformersResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/top-performers?dateRange=${dateRange}`, {
              headers: { 'Content-Type': 'application/json' }
            })
            if (topPerformersResponse.ok) {
              const tpData = await topPerformersResponse.json()
              setTopPerformers(tpData)
            }
            break

          case 'inventory':
            if (!inventoryData) {
              const inventoryResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/inventory?dateRange=${dateRange}`, {
                headers: { 'Content-Type': 'application/json' }
              })
              if (inventoryResponse.ok) {
                const invData = await inventoryResponse.json()
                setInventoryData(invData)
              }
            }
            break

          case 'low-stock':
            if (!lowStockData) {
              const lowStockResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/low-stock?dateRange=${dateRange}`, {
                headers: { 'Content-Type': 'application/json' }
              })
              if (lowStockResponse.ok) {
                const lsData = await lowStockResponse.json()
                setLowStockData(lsData)
              }
            }
            break

          case 'aging-inventory':
            if (!agingInventoryData) {
              const agingResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/aging-inventory?dateRange=${dateRange}`, {
                headers: { 'Content-Type': 'application/json' }
              })
              if (agingResponse.ok) {
                const agingData = await agingResponse.json()
                setAgingInventoryData(agingData)
              }
            }
            break

          case 'profitability':
            const profitabilityResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/profitability?dateRange=${dateRange}`, {
              headers: { 'Content-Type': 'application/json' }
            })
            if (profitabilityResponse.ok) {
              const profData = await profitabilityResponse.json()
              setProfitabilityData(profData)
            }
            break

          case 'demand-forecast':
            const demandForecastResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/demand-forecast?forecastPeriod=${forecastPeriod}`, {
              headers: { 'Content-Type': 'application/json' }
            })
            if (demandForecastResponse.ok) {
              const dfData = await demandForecastResponse.json()
              setDemandForecastData(dfData)
            }
            break

          case 'financial-warehouse':
            if (!financialData) {
              const financialResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/financial?dateRange=${dateRange}`, {
                headers: { 'Content-Type': 'application/json' }
              })
              if (financialResponse.ok) {
                const finData = await financialResponse.json()
                setFinancialData(finData)
              }
            }
            break

          case 'locations':
            if (!locationData) {
              const locationResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/locations`, {
                headers: { 'Content-Type': 'application/json' }
              })
              if (locationResponse.ok) {
                const locData = await locationResponse.json()
                setLocationData(locData)
              }
            }
            break

          case 'performance-metrics':
            if (!performanceMetricsData) {
              const metricsResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/performance-metrics`, {
                headers: { 'Content-Type': 'application/json' }
              })
              if (metricsResponse.ok) {
                const metData = await metricsResponse.json()
                setPerformanceMetricsData(metData)
              }
            }
            break

          case 'channel-performance':
            // Fetch revenue by channel
            const revenueResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/channel-performance/revenue?from=${dateRange}`, {
              headers: { 'Content-Type': 'application/json' }
            })
            if (revenueResponse.ok) {
              const revData = await revenueResponse.json()
              setChannelRevenueData(revData)
            }

            // Fetch top SKUs by channel
            const topSkusResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/channel-performance/top-skus?from=${dateRange}&limit=10`, {
              headers: { 'Content-Type': 'application/json' }
            })
            if (topSkusResponse.ok) {
              const skuData = await topSkusResponse.json()
              setChannelTopSkusData(skuData)
            }

            // Fetch trends
            const trendsResponse = await fetch(`${baseUrl}/api/demo/reports/customer/2/channel-performance/trends?from=${dateRange}`, {
              headers: { 'Content-Type': 'application/json' }
            })
            if (trendsResponse.ok) {
              const trendData = await trendsResponse.json()
              setChannelTrendsData(trendData)
            }
            break
        }

        setError(null)
      } catch (err) {
        console.error('Failed to fetch demo data:', err)
        setError('Unable to load demo data: ' + (err instanceof Error ? err.message : String(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchDemoData()
  }, [currentReport, dateRange, forecastPeriod, inventoryData, lowStockData, agingInventoryData, financialData, locationData, performanceMetricsData, channelRevenueData, channelTopSkusData, channelTrendsData])

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
      'performance-metrics': 4,
      'channel-performance': 2
    })
  }, [])

  // Function to check if a report is available at the current tier level
  const isReportAvailable = (reportKey: string): boolean => {
    const requiredLevel = reportAccess[reportKey]
    const available = requiredLevel ? planTier >= requiredLevel : false
    console.log(`Report: ${reportKey}, Required: ${requiredLevel}, Current Tier: ${planTier}, Available: ${available}`)
    return available
  }

  // CSV Export Helper Functions
  const exportInventoryCSV = () => {
    if (!inventoryData?.products) return
    
    const rows: string[] = ['"SKU","PRODUCT","QUANTITY","REORDER LEVEL","STATUS"']
    inventoryData.products.forEach((item: any) => {
      rows.push(`"${item.sku}","${item.name}",${item.quantity},${item.reorderLevel},"${item.status}"`)
    })
    
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `inventory-report-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportLowStockCSV = () => {
    if (!lowStockData?.items) return
    
    const rows: string[] = ['"SKU","PRODUCT","LOCATION","CURRENT STOCK","THRESHOLD","DAYS LEFT"']
    lowStockData.items.forEach((item: any) => {
      rows.push(`"${item.sku}","${item.productName}","${item.location}",${item.currentStock},${item.threshold},${item.daysLeft || 'N/A'}"`)
    })
    
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `low-stock-report-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportProfitabilityCSV = () => {
    if (!profitabilityData?.productProfitability) return
    
    const rows: string[] = ['"SKU","PRODUCT","REVENUE","COST","MARGIN","MARGIN %"']
    profitabilityData.productProfitability.forEach((item: any) => {
      rows.push(`"${item.sku}","${item.name}",${item.revenue},${item.cost},${item.margin},${item.marginPercentage}"`)
    })
    
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `profitability-report-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportFinancialCSV = () => {
    if (!financialData?.inventory) return
    
    const rows: string[] = ['"LOCATION","TOTAL VALUE","TOTAL ITEMS","AVG UNIT VALUE"']
    financialData.inventory.forEach((item: any) => {
      rows.push(`"${item.location}",${item.totalValue},${item.totalItems},${item.avgUnitValue}"`)
    })
    
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `financial-warehouse-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportLocationsCSV = () => {
    if (!locationData?.locations) return
    
    const rows: string[] = ['"LOCATION","ITEMS","TOTAL QUANTITY","CAPACITY USED","STATUS"']
    locationData.locations.forEach((item: any) => {
      rows.push(`"${item.name}",${item.itemCount},${item.totalQuantity},${item.capacityUsed}%,"${item.status}"`)
    })
    
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

  const exportPerformanceMetricsCSV = () => {
    if (!performanceMetricsData?.velocityMetrics?.products) return
    
    const rows: string[] = ['"SKU","PRODUCT","VELOCITY","TURNOVER","DAYS OF STOCK"']
    performanceMetricsData.velocityMetrics.products.forEach((item: any) => {
      rows.push(`"${item.sku}","${item.name}",${item.velocity},${item.turnover},${item.daysOfStock}"`)
    })
    
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `performance-metrics-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportChannelPerformanceCSV = () => {
    if (!channelRevenueData) return
    
    const rows: string[] = ['"CHANNEL","REVENUE","QUANTITY","TRANSACTIONS"']
    channelRevenueData.forEach((item: any) => {
      rows.push(`"${item.channel}",${item.revenue},${item.quantity},${item.transactions}"`)
    })
    
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `channel-performance-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
                  onClick={() => available && setCurrentReport(key as 'dashboard' | 'inventory' | 'low-stock' | 'aging-inventory' | 'profitability' | 'demand-forecast' | 'financial-warehouse' | 'locations' | 'performance-metrics')}
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
        {currentReport !== 'demand-forecast' && currentReport !== 'financial-warehouse' && currentReport !== 'locations' && currentReport !== 'performance-metrics' && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {currentReport === 'dashboard' ? 'Demo Picker Dashboard' : currentReport === 'inventory' ? 'Inventory Report' : currentReport === 'low-stock' ? 'Low Stock Report' : currentReport === 'aging-inventory' ? 'Aging Inventory Report' : currentReport === 'profitability' ? 'Profitability Report' : 'Demand Forecast'}
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
                : currentReport === 'profitability'
                ? 'Product-level profit analysis and margins'
                : 'Predict future inventory needs based on historical sales patterns'}
            </p>
          </div>
        )}

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
              {displayData?.kpis && Array.isArray(displayData.kpis) ? (
                displayData.kpis.map((kpi: any, idx: number) => (
                  <div key={idx} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">{kpi.label}</h3>
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                      {typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}
                    </p>
                    <p className={`text-sm font-medium ${kpi.trend && kpi.trend.startsWith('+') ? 'text-green-600' : 'text-gray-600'}`}>
                      {kpi.trend}
                    </p>
                  </div>
                ))
              ) : (
                <div className="col-span-4 text-center py-8 text-gray-500">
                  <p>No KPI data available. Check console for details.</p>
                  <p className="text-xs mt-2">{displayData ? `Data structure: ${JSON.stringify(displayData).substring(0, 200)}` : 'No data'}</p>
                </div>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-5 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Top Performers (Last 7 Days)</h2>
              </div>
              <div className="p-6">
                {topPerformers?.topPerformers && topPerformers.topPerformers.length > 0 ? (
                  <div className="space-y-2">
                    {topPerformers.topPerformers.slice(0, 10).map((performer: any) => (
                      <div 
                        key={performer.rank} 
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{performer.name}</p>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-teal-600">{performer.picksPerHour.toFixed(1)} picks/hr</p>
                            <p className="text-xs text-gray-500">{performer.picks} total picks</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Loading performers...</p>
                )}
              </div>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
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

                {/* Transaction Types by User - Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">User</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Transaction Type</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {displayData.activitySummary.byUser && displayData.activitySummary.byUser.map((userGroup: any, userIdx: number) => {
                        const transactionTypes = userGroup.transactionTypes || []
                        return transactionTypes.map((type: any, typeIdx: number) => (
                          <tr key={`${userIdx}-${typeIdx}`} className="hover:bg-gray-50">
                            {typeIdx === 0 && (
                              <td 
                                rowSpan={transactionTypes.length}
                                className="px-4 py-3 font-medium text-gray-900 align-top border-r"
                              >
                                {userGroup.user}
                              </td>
                            )}
                            <td className="px-4 py-3 text-gray-600">{type.type}</td>
                            <td className="px-4 py-3 text-right font-medium text-gray-900">{type.count}</td>
                          </tr>
                        ))
                      })}
                    </tbody>
                  </table>
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
              <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Inventory Items</h3>
                <button onClick={exportInventoryCSV} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  ⬇ Export CSV
                </button>
              </div>
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
              <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Low Stock Items</h3>
                <button onClick={exportLowStockCSV} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  ⬇ Export CSV
                </button>
              </div>
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
          <DemoAgingInventoryReport agingInventoryData={agingInventoryData} />
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
                  <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Top Profitable Products</h3>
                    <button onClick={exportProfitabilityCSV} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">⬇ Export CSV</button>
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
        ) : currentReport === 'demand-forecast' ? (
          <div className="space-y-6">
            {demandForecastData ? (
              <>
                {/* Title and Forecast Period Selection */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Demand Forecast</h2>
                    <p className="text-sm text-gray-600 mt-1">Predict future inventory needs based on historical sales patterns</p>
                  </div>
                  <div className="flex gap-2">
                    {['7days', '14days', '30days', '60days', '90days'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setForecastPeriod(period)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          period === forecastPeriod
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {period === '7days' ? '7 Days' : period === '14days' ? '14 Days' : period === '30days' ? '30 Days' : period === '60days' ? '60 Days' : '90 Days'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">SKUs Analyzed</p>
                    <p className="text-3xl font-bold text-gray-900">{demandForecastData.kpis.skusAnalyzed}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Forecasted Demand</p>
                    <p className="text-3xl font-bold text-gray-900">{demandForecastData.kpis.totalForecastedDemand.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">units in {demandForecastData.kpis.forecastPeriod}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Avg Daily Demand</p>
                    <p className="text-3xl font-bold text-gray-900">{Math.round(demandForecastData.kpis.avgDailyDemand)}</p>
                    <p className="text-xs text-gray-500 mt-1">units/day</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">At-Risk SKUs</p>
                    <p className="text-3xl font-bold text-gray-900">{demandForecastData.kpis.atRiskSkus}</p>
                    <p className="text-xs text-gray-500 mt-1">Critical + High</p>
                  </div>
                </div>

                {/* Risk Distribution */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-red-50 rounded-lg border border-red-200 p-6 text-center">
                      <div className="text-2xl font-bold text-red-600 mb-2">{demandForecastData.riskDistribution.critical}</div>
                      <p className="text-sm font-medium text-gray-700">Critical</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg border border-orange-200 p-6 text-center">
                      <div className="text-2xl font-bold text-orange-600 mb-2">{demandForecastData.riskDistribution.high}</div>
                      <p className="text-sm font-medium text-gray-700">High</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6 text-center">
                      <div className="text-2xl font-bold text-yellow-600 mb-2">{demandForecastData.riskDistribution.medium}</div>
                      <p className="text-sm font-medium text-gray-700">Medium</p>
                    </div>
                    <div className="bg-green-50 rounded-lg border border-green-200 p-6 text-center">
                      <div className="text-2xl font-bold text-green-600 mb-2">{demandForecastData.riskDistribution.low}</div>
                      <p className="text-sm font-medium text-gray-700">Low</p>
                    </div>
                  </div>
                </div>

                {/* Forecast Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Demand Forecasts</h3>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                      ⬇ Export CSV
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left font-medium text-gray-700">SKU</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-700">PRODUCT</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-700">CATEGORY</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-700">AVG DAILY</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-700">FORECAST</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-700">TREND</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-700">CURRENT STOCK</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-700">DAYS LEFT</th>
                          <th className="px-6 py-3 text-right font-medium text-gray-700">CONFIDENCE</th>
                          <th className="px-6 py-3 text-left font-medium text-gray-700">RISK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {demandForecastData.forecastItems.map((item: any) => (
                          <tr key={item.sku} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">{item.sku}</td>
                            <td className="px-6 py-4 text-gray-900 font-medium">{item.productName}</td>
                            <td className="px-6 py-4 text-gray-600 text-sm">{item.category}</td>
                            <td className="px-6 py-4 text-right text-gray-900">{item.avgDaily}</td>
                            <td className="px-6 py-4 text-right text-gray-900 font-semibold">{item.forecast}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={`font-medium ${item.trend > 0 ? 'text-green-600' : item.trend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                {item.trend > 0 ? '+' : ''}{item.trend}%
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-900">{item.currentStock}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={`font-semibold ${item.daysLeft < 5 ? 'text-red-600' : 'text-gray-900'}`}>
                                {item.daysLeft}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-900">{item.confidence}%</td>
                            <td className="px-6 py-4">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                item.risk === 'Critical' ? 'bg-red-100 text-red-800' :
                                item.risk === 'High' ? 'bg-orange-100 text-orange-800' :
                                item.risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {item.risk}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Loading forecast data...</p>
            )}
          </div>
        ) : currentReport === 'financial-warehouse' ? (
          <div className="space-y-6">
            {financialData ? (
              <>
                {/* Title and Date Range Selection */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Financial Report</h2>
                    <p className="text-sm text-gray-600 mt-1">Comprehensive financial metrics and performance analysis</p>
                  </div>
                  <div className="flex gap-2">
                    {['today', 'yesterday', 'last7days'].map((period) => (
                      <button
                        key={period}
                        onClick={() => setDateRange(period)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          period === dateRange
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {period === 'today' ? 'Today' : period === 'yesterday' ? 'Yesterday' : 'Last 7 Days'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">${(financialData.kpis.totalRevenue / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-gray-500 mt-1">Orders: {financialData.kpis.totalOrders}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Gross Profit</p>
                    <p className="text-3xl font-bold text-gray-900">${(financialData.kpis.grossProfit / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-gray-500 mt-1">{financialData.kpis.grossMarginPercent.toFixed(1)}% margin</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Cost of Goods Sold</p>
                    <p className="text-3xl font-bold text-gray-900">${(financialData.kpis.cogs / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-gray-500 mt-1">{financialData.kpis.cogsPercent.toFixed(1)}% of revenue</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Avg Order Value</p>
                    <p className="text-3xl font-bold text-gray-900">${financialData.kpis.avgOrderValue.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Units: {Math.round(financialData.kpis.totalUnits)}</p>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Performance</h3>
                    <div className="space-y-3">
                      {financialData.categoryPerformance.map((cat: any) => (
                        <div key={cat.category} className="flex items-center justify-between">
                          <span className="text-gray-600">{cat.category}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{width: `${(cat.revenue / financialData.kpis.totalRevenue) * 100}%`}}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-16 text-right">
                              ${(cat.revenue / 1000).toFixed(1)}K
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Return Rate:</span>
                        <span className="font-medium">{financialData.metrics.returnRate.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Customer LTV:</span>
                        <span className="font-medium">${financialData.metrics.customerLTV.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Inventory Turnover:</span>
                        <span className="font-medium">{financialData.metrics.inventoryTurnover.toFixed(2)}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Days Inventory Outstanding:</span>
                        <span className="font-medium">{Math.round(financialData.metrics.daysInventoryOutstanding)} days</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600 font-medium">Profit Margin:</span>
                        <span className="font-semibold text-green-600">{financialData.metrics.profitMargin.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Products by Revenue */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Top Products by Revenue</h3>
                    <button onClick={exportFinancialCSV} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">⬇ Export CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">SKU</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Product</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Units Sold</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Revenue</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">COGS</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Profit</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Margin %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {financialData.topProducts.map((item: any) => (
                          <tr key={item.sku} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">{item.sku}</td>
                            <td className="px-6 py-4 text-gray-900 font-medium">{item.productName}</td>
                            <td className="px-6 py-4 text-right text-gray-900">{item.unitsSold}</td>
                            <td className="px-6 py-4 text-right text-gray-900 font-semibold">${item.revenue.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right text-gray-600">${item.cogs.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right font-semibold text-green-600">${item.profit.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
                        <strong>Enterprise Feature:</strong> This demo shows comprehensive financial metrics including revenue analysis, profitability by product and category, inventory turnover, and key performance indicators. Get actionable insights to optimize pricing, inventory levels, and product mix.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Loading financial data...</p>
            )}
          </div>
        ) : currentReport === 'locations' ? (
          <div className="space-y-6">
            {locationData ? (
              <>
                {/* Title */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Location Analysis</h2>
                  <p className="text-sm text-gray-600 mt-1">Warehouse performance, inventory distribution, and operational efficiency across locations</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Locations</p>
                    <p className="text-3xl font-bold text-gray-900">{locationData.kpis.totalLocations}</p>
                    <p className="text-xs text-gray-500 mt-1">Active warehouses</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Inventory Value</p>
                    <p className="text-3xl font-bold text-gray-900">${(locationData.kpis.totalInventoryValue / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-gray-500 mt-1">Across all locations</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Avg Utilization</p>
                    <p className="text-3xl font-bold text-gray-900">{locationData.kpis.avgUtilization.toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 mt-1">Capacity used</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total SKUs</p>
                    <p className="text-3xl font-bold text-gray-900">{locationData.kpis.totalSkus}</p>
                    <p className="text-xs text-gray-500 mt-1">Unique products</p>
                  </div>
                </div>

                {/* Location Performance Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Location Performance</h3>
                    <button onClick={exportLocationsCSV} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">⬇ Export CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Location</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">SKUs</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Inventory Value</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Units</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Utilization</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Low Stock Items</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Health</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {locationData.locations.map((location: any) => (
                          <tr key={location.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{location.name}</td>
                            <td className="px-6 py-4 text-right text-gray-900">{location.skuCount}</td>
                            <td className="px-6 py-4 text-right font-semibold text-gray-900">${(location.inventoryValue / 1000).toFixed(1)}K</td>
                            <td className="px-6 py-4 text-right text-gray-900">{location.totalUnits.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${location.utilization > 85 ? 'bg-red-500' : location.utilization > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                    style={{width: `${location.utilization}%`}}
                                  ></div>
                                </div>
                                <span className="text-xs font-medium w-10 text-right">{location.utilization}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                location.lowStockItems > 20 ? 'bg-red-100 text-red-800' :
                                location.lowStockItems > 10 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {location.lowStockItems}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                location.health === 'Critical' ? 'bg-red-100 text-red-800' :
                                location.health === 'Warning' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {location.health}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top SKUs by Location */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top SKUs by Distribution</h3>
                  <div className="space-y-3">
                    {locationData.topSkus.map((sku: any) => (
                      <div key={sku.sku} className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-xs font-semibold text-gray-900">{sku.sku}</p>
                          <p className="text-sm text-gray-600">{sku.productName}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-40">
                            <div className="flex gap-1 h-3">
                              {sku.distribution.map((dist: any, idx: number) => (
                                <div 
                                  key={idx}
                                  className={`flex-1 rounded-sm ${
                                    dist.percentage > 30 ? 'bg-blue-600' :
                                    dist.percentage > 20 ? 'bg-blue-400' :
                                    'bg-blue-200'
                                  }`}
                                  title={`${dist.location}: ${dist.percentage}%`}
                                ></div>
                              ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 text-center">Total Units: {sku.totalUnits}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-800">
                        <strong>Premium Feature:</strong> This demo shows detailed warehouse location analysis including inventory distribution, capacity utilization, and location health metrics. Optimize inventory placement across facilities to improve efficiency and reduce fulfillment times.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Loading location data...</p>
            )}
          </div>
        ) : currentReport === 'performance-metrics' ? (
          <div className="space-y-6">
            {performanceMetricsData ? (
              <>
                {/* Title */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Performance Metrics</h2>
                  <p className="text-sm text-gray-600 mt-1">Inventory velocity, turnover, and product-level performance analysis</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Avg Velocity</p>
                    <p className="text-3xl font-bold text-gray-900">{performanceMetricsData.summary.averageVelocity.toFixed(1)}</p>
                    <p className="text-xs text-gray-500 mt-1">Units/day</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Fast Movers</p>
                    <p className="text-3xl font-bold text-gray-900">{performanceMetricsData.velocityMetrics.fastMovingCount}</p>
                    <p className="text-xs text-gray-500 mt-1">&gt; 10 units/day</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Avg Turnover</p>
                    <p className="text-3xl font-bold text-gray-900">{performanceMetricsData.summary.averageTurnover.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 mt-1">Turns/period</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
                    <p className="text-sm font-medium text-gray-600 mb-2">Dead Stock</p>
                    <p className="text-3xl font-bold text-gray-900">{performanceMetricsData.velocityMetrics.deadStockCount}</p>
                    <p className="text-xs text-gray-500 mt-1">&lt; 1 unit/day</p>
                  </div>
                </div>

                {/* Velocity Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6 overflow-hidden">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Velocity Distribution</h3>
                    <div className="space-y-4">
                      {(() => {
                        const maxCount = Math.max(
                          performanceMetricsData.velocityMetrics.fastMovingCount,
                          performanceMetricsData.velocityMetrics.mediumMovingCount,
                          performanceMetricsData.velocityMetrics.slowMovingCount,
                          performanceMetricsData.velocityMetrics.deadStockCount
                        )
                        return (
                          <>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600 flex-1 min-w-0">Fast Movers (&gt;10)</span>
                                <span className="text-sm font-medium text-gray-900 flex-shrink-0">{performanceMetricsData.velocityMetrics.fastMovingCount}</span>
                              </div>
                              <div className="overflow-hidden bg-gray-200 rounded-full h-2">
                                <div className="bg-green-500 h-2 rounded-full" style={{width: `${(performanceMetricsData.velocityMetrics.fastMovingCount / maxCount) * 100}%`}}></div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600 flex-1 min-w-0">Medium Movers (5-10)</span>
                                <span className="text-sm font-medium text-gray-900 flex-shrink-0">{performanceMetricsData.velocityMetrics.mediumMovingCount}</span>
                              </div>
                              <div className="overflow-hidden bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-500 h-2 rounded-full" style={{width: `${(performanceMetricsData.velocityMetrics.mediumMovingCount / maxCount) * 100}%`}}></div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600 flex-1 min-w-0">Slow Movers (1-5)</span>
                                <span className="text-sm font-medium text-gray-900 flex-shrink-0">{performanceMetricsData.velocityMetrics.slowMovingCount}</span>
                              </div>
                              <div className="overflow-hidden bg-gray-200 rounded-full h-2">
                                <div className="bg-yellow-500 h-2 rounded-full" style={{width: `${(performanceMetricsData.velocityMetrics.slowMovingCount / maxCount) * 100}%`}}></div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-600 flex-1 min-w-0">Dead Stock (&lt;1)</span>
                                <span className="text-sm font-medium text-gray-900 flex-shrink-0">{performanceMetricsData.velocityMetrics.deadStockCount}</span>
                              </div>
                              <div className="overflow-hidden bg-gray-200 rounded-full h-2">
                                <div className="bg-red-500 h-2 rounded-full" style={{width: `${(performanceMetricsData.velocityMetrics.deadStockCount / maxCount) * 100}%`}}></div>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
                    <div className="space-y-3">
                      {performanceMetricsData.trends.map((trend: any) => (
                        <div key={trend.metric} className="flex items-center justify-between">
                          <span className="text-gray-600">{trend.metric}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${trend.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {trend.change >= 0 ? '+' : ''}{trend.change.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500">{trend.direction}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Top Performing SKUs</h3>
                    <button onClick={exportPerformanceMetricsCSV} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">⬇ Export CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">SKU</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Product</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Velocity</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Turnover</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Stock</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Category</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {performanceMetricsData.topPerformers.map((item: any) => (
                          <tr key={item.sku} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">{item.sku}</td>
                            <td className="px-6 py-4 text-gray-900 font-medium">{item.productName}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {item.velocity.toFixed(1)}/day
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-900 font-semibold">{item.turnoverRate.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right text-gray-900">{item.currentStock}</td>
                            <td className="px-6 py-4 text-gray-600 text-sm">{item.category}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Under Performers */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Under Performing SKUs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">SKU</th>
                          <th className="px-6 py-3 text-left font-semibold text-gray-700">Product</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Velocity</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Days on Hand</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Stock</th>
                          <th className="px-6 py-3 text-right font-semibold text-gray-700">Risk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {performanceMetricsData.underPerformers.map((item: any) => (
                          <tr key={item.sku} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-gray-900">{item.sku}</td>
                            <td className="px-6 py-4 text-gray-900 font-medium">{item.productName}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {item.velocity.toFixed(2)}/day
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-gray-900">{item.daysOfStock.toFixed(0)} days</td>
                            <td className="px-6 py-4 text-right text-gray-900">{item.currentStock}</td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                item.daysOfStock > 90 ? 'bg-red-100 text-red-800' :
                                item.daysOfStock > 60 ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {item.daysOfStock > 90 ? 'Critical' : item.daysOfStock > 60 ? 'High' : 'Medium'}
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
                        <strong>Premium Feature:</strong> This demo shows comprehensive inventory performance metrics including product velocity, turnover rates, and inventory optimization insights. Identify fast movers, slow movers, and dead stock to optimize inventory mix and improve cash flow.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Loading performance metrics...</p>
            )}
          </div>
        ) : currentReport === 'channel-performance' ? (
          <div className="space-y-6">
            {channelRevenueData && channelTopSkusData ? (
              <>
                {/* Title */}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Channel Performance</h2>
                  <p className="text-sm text-gray-600 mt-1">Revenue analysis and top SKUs by sales channel</p>
                </div>

                {/* Revenue by Channel */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Channel</h3>
                  <div className="space-y-3">
                    {channelRevenueData.map((item: any) => {
                      const maxRevenue = Math.max(...channelRevenueData.map((c: any) => c.revenue))
                      const percentage = (item.revenue / maxRevenue) * 100
                      return (
                        <div key={item.channel}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-gray-900">{item.channel}</span>
                            <span className="text-sm font-semibold text-gray-900">${item.revenue.toFixed(2)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-xs text-gray-500">{item.quantity} units</span>
                            <span className="text-xs text-gray-500">{item.transactions} transactions</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Top SKUs by Channel */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Top SKUs by Channel</h3>
                    <button onClick={exportChannelPerformanceCSV} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">⬇ Export CSV</button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">SKU</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Channel</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Revenue</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Quantity</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Transactions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {channelTopSkusData.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.sku}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{item.channel}</td>
                            <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">${item.revenue.toFixed(2)}</td>
                            <td className="px-6 py-4 text-right text-sm text-gray-600">{item.quantity}</td>
                            <td className="px-6 py-4 text-right text-sm text-gray-600">{item.transactions}</td>
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
                        <strong>Standard Feature:</strong> This demo shows revenue analysis and top performing SKUs across your sales channels (Web, Amazon, Shopify, eBay, Bulk). Identify which channels drive the most revenue and which products perform best on each platform.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500">Loading channel performance data...</p>
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
