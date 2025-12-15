import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api/client'
import { format, startOfToday, endOfToday, subDays } from 'date-fns'
import PickerPerformanceDetail from '../components/PickerPerformanceDetail'

export default function Dashboard() {
  const { user } = useAuth()
  // For now, we'll use a simple mapping. In production, this would come from user profile/customer association
  const getCustomerIdFromUser = (email: string) => {
    // Simple mapping - in production this would be stored in database
    if (email === 'Kim.baumann@skuvault.com') return 1
    // Add more mappings as needed
    return 1 // Default for demo
  }
  
  const [customerId] = useState(() => getCustomerIdFromUser(user?.email || ''))
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last7' | 'custom'>('today')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedPicker, setSelectedPicker] = useState<string | null>(null)

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
        if (fromDate && !toDate) {
          return { from: fromDate, to: format(now, 'yyyy-MM-dd') }
        }
        return fromDate && toDate ? { from: fromDate, to: toDate } : undefined
      default:
        return undefined
    }
  }

  const dateParams = getDateParams()

  const { data: transactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions', customerId, dateParams],
    queryFn: () => {
      if (dateRange === 'today') {
        return apiClient.getTransactionsToday(customerId)
      }
      return apiClient.getTransactions(
        customerId,
        dateParams?.from,
        dateParams?.to
      )
    },
    enabled: !!dateParams || dateRange === 'today',
  })

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['summary', customerId, dateParams],
    queryFn: () => {
      if (dateRange === 'today') {
        return apiClient.getTransactionsSummaryToday(customerId)
      }
      return apiClient.getTransactionsSummary(
        customerId,
        dateParams?.from,
        dateParams?.to
      )
    },
    enabled: !!dateParams || dateRange === 'today',
  })

  const stats = summary?.summary.reduce((acc, item) => {
    acc.totalMoves += item.count
    acc.totalQuantity += Math.abs(item.totalQuantity)
    return acc
  }, { totalMoves: 0, totalQuantity: 0 }) || { totalMoves: 0, totalQuantity: 0 }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Picker Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Transaction activity for {user?.email} - Customer #{customerId}
        </p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Total Movements</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingSummary ? '...' : stats.totalMoves.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Total Quantity</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingSummary ? '...' : stats.totalQuantity.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Transactions</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingTransactions ? '...' : transactions?.totalCount.toLocaleString() || 0}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-sm font-medium text-gray-600">Users Active</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingSummary
              ? '...'
              : new Set(summary?.summary.map((s) => s.user)).size || 0}
          </p>
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
              {loadingSummary ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : summary?.summary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No data for selected period
                  </td>
                </tr>
              ) : (
                summary?.summary.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <button
                        onClick={() => setSelectedPicker(item.user || 'Unknown')}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {item.user || 'Unknown'}
                      </button>
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
                      {Math.abs(item.totalQuantity).toLocaleString()}
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
              {loadingTransactions ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : transactions?.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No transactions for selected period
                  </td>
                </tr>
              ) : (
                transactions?.transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(tx.occurredAtUtc), 'MMM d, h:mm a')}
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
                      <span className={tx.quantityChange < 0 ? 'text-red-600' : 'text-green-600'}>
                        {tx.quantityChange > 0 ? '+' : ''}{tx.quantityChange}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.location?.code || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tx.performedBy?.split('@')[0] || 'Unknown'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Picker Performance Modal */}
      {selectedPicker && (
        <PickerPerformanceDetail
          customerId={customerId}
          pickerName={selectedPicker}
          onClose={() => setSelectedPicker(null)}
          dateRange={dateParams}
        />
      )}
    </div>
  )
}
