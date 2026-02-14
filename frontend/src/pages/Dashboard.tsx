import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api/client'
import { format, startOfToday, endOfToday, subDays, startOfDay, endOfDay } from 'date-fns'
import { Info } from 'lucide-react'
import PickerPerformanceDetail from '../components/PickerPerformanceDetail'
import PickerPerformanceChart from '../components/PickerPerformanceChart'

interface Tooltip {
  [key: string]: string
}

const METRIC_TOOLTIPS: Tooltip = {
  totalMovements: 'Total count of all transaction entries (picks, adds, removes, adjustments) by all users during the selected period',
  totalQuantity: 'Sum of all item quantities affected by transactions during the selected period',
  picksPerHour: 'Total picks divided by hours in the selected period. Measures average picking productivity/efficiency',
  usersActive: 'Number of unique users/pickers who performed transactions during the selected period',
  activityCount: 'Number of transactions (picks, adds, removes, adjustments) performed by this user',
  activityTotalQuantity: 'Total number of units/items affected by all transactions performed by this user'
}

export default function Dashboard() {
  const { user } = useAuth()
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>('user')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortableHeader = ({ field, label, tooltip }: { field: string; label: string; tooltip?: string }) => (
    <th 
      onClick={() => handleSort(field)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {sortField === field && (
          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
        {tooltip && (
          <div 
            className="relative inline-block"
            onMouseEnter={() => setHoveredTooltip(field)}
            onMouseLeave={() => setHoveredTooltip(null)}
          >
            <Info 
              className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0"
            />
            {hoveredTooltip === field && (
              <div className="absolute right-0 top-6 w-48 bg-gray-900 text-white text-xs rounded p-2 z-40 pointer-events-none whitespace-normal shadow-lg">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  )
  
  const renderTooltip = (key: string) => (
    <div className="relative group inline-block">
      <Info 
        className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help"
        onMouseEnter={() => setHoveredTooltip(key)}
        onMouseLeave={() => setHoveredTooltip(null)}
      />
      {hoveredTooltip === key && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 bg-gray-900 text-white text-xs rounded p-2 z-10 pointer-events-none">
          {METRIC_TOOLTIPS[key]}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  )
  
  // Check if admin is impersonating a customer
  const getCustomerIdFromContext = () => {
    const adminViewingData = sessionStorage.getItem('adminViewingAs')
    if (adminViewingData) {
      try {
        const data = JSON.parse(adminViewingData)
        if (data.customerId) {
          console.log('Using impersonated customer ID:', data.customerId)
          return data.customerId
        }
      } catch (e) {
        console.error('Failed to parse admin viewing context:', e)
      }
    }
    return null
  }
  
  // For now, we'll use a simple mapping. In production, this would come from user profile/customer association
  const getCustomerIdFromUser = (email: string) => {
    // Simple mapping - in production this would be stored in database
    if (email === 'Kim.baumann@skuvault.com') return 1
    // Add more mappings as needed
    return 1 // Default for demo
  }
  
  const [customerId] = useState(() => {
    const impersonatedId = getCustomerIdFromContext()
    if (impersonatedId) return impersonatedId
    return getCustomerIdFromUser(user?.email || '')
  })
  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'last7' | 'custom'>('today')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedPicker, setSelectedPicker] = useState<string | null>(null)

  const dateParams = useMemo(() => {
    const now = new Date()
    
    // Helper to convert local time to UTC ISO string
    const toUTC = (date: Date): string => {
      return date.toISOString()
    }
    
    switch (dateRange) {
      case 'today':
        // Get start and end of today in local timezone, then convert to UTC
        const startLocal = startOfToday()
        const endLocal = endOfToday()
        return {
          from: toUTC(startLocal),
          to: toUTC(endLocal)
        }
      case 'yesterday':
        const yesterday = subDays(now, 1)
        const startYesterdayLocal = startOfDay(yesterday)
        const endYesterdayLocal = endOfDay(yesterday)
        return {
          from: toUTC(startYesterdayLocal),
          to: toUTC(endYesterdayLocal)
        }
      case 'last7':
        const sevenDaysAgo = subDays(now, 7)
        const startSevenLocal = startOfDay(sevenDaysAgo)
        const endSevenLocal = endOfToday()
        return {
          from: toUTC(startSevenLocal),
          to: toUTC(endSevenLocal)
        }
      case 'custom':
        if (fromDate && !toDate) {
          const customStart = new Date(fromDate + 'T00:00:00')
          const customEnd = endOfToday()
          return { from: toUTC(customStart), to: toUTC(customEnd) }
        }
        if (fromDate && toDate) {
          const customStart = new Date(fromDate + 'T00:00:00')
          const customEnd = new Date(toDate + 'T23:59:59')
          return { 
            from: toUTC(customStart), 
            to: toUTC(customEnd)
          }
        }
        return undefined
      default:
        return undefined
    }
  }, [dateRange, fromDate, toDate])

  // Get date params for picker detail modal (includes end of day)
  const pickerDateParams = useMemo(() => {
    const now = new Date()
    switch (dateRange) {
      case 'today':
        return {
          from: format(startOfToday(), 'yyyy-MM-dd'),
          to: format(now, "yyyy-MM-dd'T'HH:mm:ss")  // Use current time, not end of day
        }
      case 'yesterday':
        const yesterday = subDays(now, 1)
        return {
          from: format(yesterday, 'yyyy-MM-dd'),
          to: format(new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1), "yyyy-MM-dd'T'HH:mm:ss")
        }
      case 'last7':
        return {
          from: format(subDays(now, 7), 'yyyy-MM-dd'),
          to: format(now, "yyyy-MM-dd'T'HH:mm:ss")  // Use current time, not end of day
        }
      case 'custom':
        if (fromDate && !toDate) {
          return { from: fromDate, to: format(now, "yyyy-MM-dd'T'HH:mm:ss") }
        }
        return fromDate && toDate ? { 
          from: fromDate, 
          to: format(new Date(toDate + 'T23:59:59'), "yyyy-MM-dd'T'HH:mm:ss")
        } : undefined
      default:
        return undefined
    }
  }, [dateRange, fromDate, toDate])

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['summary', customerId, dateParams],
    queryFn: () => {
      // Always use the date-range version to respect timezone
      return apiClient.getTransactionsSummary(
        customerId,
        dateParams?.from,
        dateParams?.to
      )
    },
    enabled: !!dateParams,
  })

  const stats = summary?.summary.reduce((acc, item) => {
    acc.totalMoves += item.count
    acc.totalQuantity += Math.abs(item.totalQuantity)
    if (item.transactionType === 'Pick') {
      acc.totalPicks += item.count
    }
    return acc
  }, { totalMoves: 0, totalQuantity: 0, totalPicks: 0 }) || { totalMoves: 0, totalQuantity: 0, totalPicks: 0 }

  // Calculate hours from date range
  const calculateHours = () => {
    if (!dateParams?.from || !dateParams?.to) return 1
    const from = new Date(dateParams.from)
    const to = new Date(dateParams.to)
    const hours = (to.getTime() - from.getTime()) / (1000 * 60 * 60)
    return Math.max(hours, 1) // Minimum 1 hour to avoid division by zero
  }

  const picksPerHour = dateParams ? (stats.totalPicks / calculateHours()).toFixed(1) : '0'

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
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-600">Total Movements</p>
            {renderTooltip('totalMovements')}
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingSummary ? '...' : stats.totalMoves.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-600">Total Quantity</p>
            {renderTooltip('totalQuantity')}
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingSummary ? '...' : stats.totalQuantity.toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-600">Picks Per Hour</p>
            {renderTooltip('picksPerHour')}
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingSummary ? '...' : picksPerHour}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-600">Users Active</p>
            {renderTooltip('usersActive')}
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {loadingSummary
              ? '...'
              : new Set(summary?.summary.map((s) => s.user)).size || 0}
          </p>
        </div>
      </div>

      {/* Top Performers */}
      {summary?.summary && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Performers {dateRange === 'today' ? 'Today' : dateRange === 'yesterday' ? 'Yesterday' : dateRange === 'last7' ? '(Last 7 Days)' : '(Selected Period)'}
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {summary.summary
                .reduce((acc, item) => {
                  const existing = acc.find(p => p.user === item.user)
                  if (existing) {
                    existing.count += item.count
                  } else {
                    acc.push({ user: item.user || 'Unknown', count: item.count })
                  }
                  return acc
                }, [] as { user: string; count: number }[])
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map((picker, idx) => {
                  const daysInRange = dateRange === 'today' || dateRange === 'yesterday' ? 1 : dateRange === 'last7' ? 7 : dateParams?.from && dateParams?.to ? Math.ceil((new Date(dateParams.to).getTime() - new Date(dateParams.from).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 1
                  const hoursWorked = daysInRange * 8
                  const picksPerHour = Math.round(picker.count / hoursWorked)
                  return (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                      <span className="font-medium text-gray-900">{picker.user}</span>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">{picksPerHour} picks/hr</div>
                        <div className="text-xs text-gray-500">{picker.count} total picks</div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>
      )}

      {/* Summary by User/Type */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Activity Summary</h2>
        </div>
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 relative z-10">
              <tr>
                <SortableHeader field="user" label="User" />
                <SortableHeader field="typeCount" label="Transaction Type" />
                <SortableHeader field="totalCount" label="Count" tooltip={METRIC_TOOLTIPS.activityCount} />
                <SortableHeader field="totalQty" label="Total Quantity" tooltip={METRIC_TOOLTIPS.activityTotalQuantity} />
              </tr>
            </thead>
            <tbody className="bg-white">
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
                Object.entries(
                  (summary?.summary || []).reduce((acc, item) => {
                    const user = item.user || 'Unknown'
                    if (!acc[user]) acc[user] = []
                    acc[user].push(item)
                    return acc
                  }, {} as Record<string, Array<{ user: string | null; transactionType: string | null; count: number; totalQuantity: number }>>)
                ).map(([user, items]) => {
                  const totalCount = items.reduce((sum, item) => sum + item.count, 0)
                  const totalQty = items.reduce((sum, item) => sum + Math.abs(item.totalQuantity), 0)
                  return { user, items, totalCount, totalQty, typeCount: items.length }
                })
                .sort((a, b) => {
                  let aVal = a[sortField as keyof typeof a]
                  let bVal = b[sortField as keyof typeof b]
                  
                  if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
                  }
                  
                  const aStr = String(aVal || '')
                  const bStr = String(bVal || '')
                  return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
                })
                .map(({ user, items, totalCount, totalQty }, userIdx) => (
                  <React.Fragment key={userIdx}>
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        <button
                          onClick={() => setSelectedPicker(user)}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {user}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-semibold">
                        {items.length} type{items.length > 1 ? 's' : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {totalCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {totalQty.toLocaleString()}
                      </td>
                    </tr>
                    {items.map((item, itemIdx) => (
                      <tr key={`${userIdx}-${itemIdx}`} className="bg-white">
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-400 pl-12">
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {item.transactionType || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                          {item.count.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                          {Math.abs(item.totalQuantity).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Picker Performance Chart */}
      {(() => {
        const { data: performanceData } = useQuery({
          queryKey: ['pickerPerformance', customerId, dateParams],
          queryFn: () => apiClient.getPickerPerformance(customerId, dateParams?.from, dateParams?.to),
          enabled: !!dateParams,
        });

        if (!performanceData?.performance) {
          return null;
        }

        // Convert performance data to chart format
        // Handle both hourly (Hour field) and daily (Date field) responses
        const chartData = performanceData.performance.map((item: any) => {
          if ('hour' in item || item.Hour !== undefined) {
            // Hourly data - construct timestamp with the hour
            const hour = item.hour !== undefined ? item.hour : item.Hour;
            // Get the actual date from dateRange context
            let baseDate = new Date();
            if (dateRange === 'yesterday') {
              baseDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
            }
            baseDate.setHours(hour, 0, 0, 0);
            return {
              timestamp: baseDate.toISOString(),
              user: item.picker,
              count: item.count
            };
          } else {
            // Daily data
            return {
              timestamp: new Date(item.date).toISOString(),
              user: item.picker,
              count: item.count
            };
          }
        });

        const uniqueDates = new Set<string>();
        chartData.forEach(item => {
          const dt = new Date(item.timestamp);
          uniqueDates.add(dt.toISOString().split('T')[0]);
        });
        console.log(`Dashboard: ${chartData.length} aggregated performance items, dates: ${Array.from(uniqueDates).sort().join(', ')}, params from=${dateParams?.from} to=${dateParams?.to}`);

        return (
          <PickerPerformanceChart
            data={chartData}
            dateRange={dateRange}
            fromDate={dateParams?.from}
            toDate={dateParams?.to}
          />
        );
      })()}

      {/* Picker Performance Modal */}
      {selectedPicker && (
        <PickerPerformanceDetail
          customerId={customerId}
          pickerName={selectedPicker}
          onClose={() => setSelectedPicker(null)}
          dateRange={pickerDateParams}
        />
      )}
    </div>
  )
}
