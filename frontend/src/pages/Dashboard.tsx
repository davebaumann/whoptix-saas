import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api/client'
import { format, startOfToday, endOfToday, subDays } from 'date-fns'
import AutoRefreshControls from '../components/AutoRefreshControls'

export default function Dashboard() {
  const { user, isLoading } = useAuth()

  // Add early loading state while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Add early return if user is not available
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Authentication required</p>
        </div>
      </div>
    )
  }

  // Check if user is admin - admins shouldn't see customer dashboard data
  if (user.roles.includes('Admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard</h2>
          <p className="text-gray-600">Welcome, Administrator!</p>
          <p className="text-gray-600 mt-2">Use the Admin section to manage customers.</p>
        </div>
      </div>
    )
  }

  // For customer users, use their customer ID
  const customerId = user.customerId || 1 // Fallback to customer 1 if no association
  
  // Debug logging
  console.log('Dashboard - User:', user)
  console.log('Dashboard - Customer ID:', customerId)
  
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last7' | 'custom'>('last7')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const getDateParams = () => {
    const now = new Date()
    switch (dateRange) {
      case 'today':
        return {
          from: format(startOfToday(), 'yyyy-MM-dd'),
          to: format(endOfToday(), 'yyyy-MM-dd')
        }
      case 'yesterday':
        const yesterday = subDays(now, 1)
        return {
          from: format(yesterday, 'yyyy-MM-dd'),
          to: format(yesterday, 'yyyy-MM-dd')
        }
      case 'last7':
        return {
          from: format(subDays(now, 7), 'yyyy-MM-dd'),
          to: format(now, 'yyyy-MM-dd')
        }
      case 'custom':
        return fromDate && toDate ? { from: fromDate, to: toDate } : undefined
      default:
        return undefined
    }
  }

  const dateParams = getDateParams()
  
  // Debug: Log the date params
  console.log('Date params:', dateParams, 'Date range:', dateRange)

  // Single API call for all dashboard data
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery({
    queryKey: ['dashboard', customerId, dateParams],
    queryFn: () => apiClient.getDashboardData(
      customerId,
      dateParams?.from,
      dateParams?.to
    ),
  })

  // Keep the packer performance and daily counts separate since they work
  const { data: packerPerformance, isLoading: loadingPackers } = useQuery({
    queryKey: ['packers', customerId, dateParams],
    queryFn: () => apiClient.getPackerPerformance(
      customerId,
      dateParams?.from,
      dateParams?.to
    ),
  })

  const { data: dailyCounts, isLoading: loadingDaily } = useQuery({
    queryKey: ['dailyCounts', customerId],
    queryFn: () => apiClient.getDailyCounts(customerId, 30),
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Picker/Packer Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">
            Transaction activity for {user?.email} - Customer #{customerId}
          </p>
        </div>
        
        {/* Auto-refresh controls */}
        <AutoRefreshControls 
          queryKey={['dashboard', customerId.toString()]} 
          defaultInterval={300000} // 5 minutes default
          className="bg-white px-4 py-2 rounded-lg shadow"
        />
      </div>

      {/* Date Range Controls */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Date Range:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange('today')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                dateRange === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateRange('yesterday')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                dateRange === 'yesterday'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDateRange('last7')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                dateRange === 'last7'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                dateRange === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom
            </button>
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 ml-4">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Total Movements</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingDashboard ? '...' : dashboardData?.kpis?.totalTransactions?.toLocaleString() || '0'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Total Quantity</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingDashboard ? '...' : dashboardData?.kpis?.totalQuantity?.toLocaleString() || '0'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Avg Items/Hour</p>
          <p className="mt-2 text-3xl font-semibold text-blue-600">
            {loadingDashboard ? '...' : (dashboardData?.kpis?.avgItemsPerHour ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Transactions</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingDashboard ? '...' : dashboardData?.kpis?.totalTransactions?.toLocaleString() || '0'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Users Active</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingDashboard ? '...' : dashboardData?.kpis?.activeUsers || 0}
          </p>
        </div>
      </div>

   {/* Packer Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Packer Performance</h2>
          <p className="text-sm text-gray-600">Sorted by total quantity packed (descending)</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Picks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Packs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty Picked
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty Packed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Qty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Active Time
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingPackers ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : (packerPerformance?.packers?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                    No packer activity for selected period
                  </td>
                </tr>
              ) : (
                packerPerformance?.packers?.map((packer, idx) => {
                  const startTime = new Date(packer.firstActivity);
                  const endTime = new Date(packer.lastActivity);
                  const duration = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)); // minutes
                  
                  return (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {packer.user}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {packer.pickCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {packer.packCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {packer.totalQuantityPicked.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {packer.totalQuantityPacked.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                        {packer.totalQuantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {duration > 60 
                          ? `${Math.floor(duration / 60)}h ${duration % 60}m`
                          : `${duration}m`
                        }
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary by User/Type */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Activity Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Quantity
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingDashboard ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : (dashboardData?.activitySummary?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No data for selected period
                  </td>
                </tr>
              ) : (
                dashboardData?.activitySummary?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.user || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {item.transactionType || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.totalQuantity.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingDashboard ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : (dashboardData?.recentTransactions?.length || 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No transactions for selected period
                  </td>
                </tr>
              ) : (
                dashboardData?.recentTransactions?.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(tx.transactionDate), 'MMM d, h:mm a')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tx.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        {tx.transactionType || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={tx.quantity < 0 ? 'text-red-600' : 'text-green-600'}>
                        {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.locationId ? `Location ${tx.locationId}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.performedBy || 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

   

      {/* Daily Activity Chart */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Daily Activity (Last 30 Days)</h2>
          <p className="text-sm text-gray-600">Total transactions per day</p>
        </div>
        <div className="p-6">
          {loadingDaily ? (
            <div className="text-center text-sm text-gray-500 py-8">
              Loading chart data...
            </div>
          ) : (dailyCounts?.dailyCounts?.length || 0) === 0 ? (
            <div className="text-center text-sm text-gray-500 py-8">
              No data available for chart
            </div>
          ) : (
            <div className="space-y-4">
              {/* Simple text-based chart for now - could be enhanced with Chart.js or similar */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dailyCounts?.dailyCounts?.slice(-7).map((day, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-700">
                      {format(new Date(day.date), 'MMM d')}
                    </div>
                    <div className="mt-2 text-2xl font-bold text-gray-900">
                      {day.totalTransactions}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      <div>Pick: {day.pickTransactions}</div>
                      <div>Pack: {day.packTransactions}</div>
                      <div>Receive: {day.receiveTransactions}</div>
                      {day.otherTransactions > 0 && <div>Other: {day.otherTransactions}</div>}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Summary stats for the period */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600">
                    {(dailyCounts?.dailyCounts?.reduce((sum, day) => sum + day.totalTransactions, 0) || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Total Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600">
                    {Math.round((dailyCounts?.dailyCounts?.reduce((sum, day) => sum + day.totalTransactions, 0) || 0) / 30).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Daily Average</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600">
                    {Math.max(...(dailyCounts?.dailyCounts?.map(day => day.totalTransactions) || [0])).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Peak Day</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600">
                    {(dailyCounts?.dailyCounts?.reduce((sum, day) => sum + day.totalQuantity, 0) || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Total Items</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
