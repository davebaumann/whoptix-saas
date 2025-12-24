import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../api/client'
import { format, startOfToday, endOfToday, subDays } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { Download } from 'lucide-react'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6']

export default function ChannelPerformance() {
  const { user } = useAuth()
  const customerId = typeof (user?.id) === 'string' ? parseInt(user.id, 10) : (user?.id || 1)
  const [dateRange, setDateRange] = useState<'today' | 'last7' | 'last30' | 'custom'>('last30')
  const [fromDate, setFromDate] = useState<string | undefined>()
  const [toDate, setToDate] = useState<string | undefined>()

  // Memoized date parameters
  const dateParams = useMemo(() => {
    const now = new Date()
    switch (dateRange) {
      case 'today':
        return {
          from: format(startOfToday(), 'yyyy-MM-dd') + 'T00:00:00Z',
          to: format(endOfToday(), "yyyy-MM-dd'T'HH:mm:ss") + 'Z'
        }
      case 'last7':
        return {
          from: format(subDays(now, 7), 'yyyy-MM-dd') + 'T00:00:00Z',
          to: format(endOfToday(), "yyyy-MM-dd'T'HH:mm:ss") + 'Z'
        }
      case 'last30':
        return {
          from: format(subDays(now, 30), 'yyyy-MM-dd') + 'T00:00:00Z',
          to: format(endOfToday(), "yyyy-MM-dd'T'HH:mm:ss") + 'Z'
        }
      case 'custom':
        if (fromDate && toDate) {
          return {
            from: fromDate + 'T00:00:00Z',
            to: toDate + 'T23:59:59Z'
          }
        }
        return undefined
      default:
        return undefined
    }
  }, [dateRange, fromDate, toDate])

  // Fetch revenue by channel
  const { data: revenueData, isLoading: loadingRevenue } = useQuery({
    queryKey: ['channelRevenue', customerId, dateParams],
    queryFn: () => apiClient.getChannelRevenueByChannel(customerId, dateParams?.from, dateParams?.to),
    enabled: !!dateParams,
  })

  // Fetch top SKUs by channel
  const { data: topSkuData, isLoading: loadingTopSkus } = useQuery({
    queryKey: ['topSkusByChannel', customerId, dateParams],
    queryFn: () => apiClient.getTopSkusByChannel(customerId, dateParams?.from, dateParams?.to, 10),
    enabled: !!dateParams,
  })



  // Calculate total revenue
  const totalRevenue = revenueData?.revenue.reduce((sum, channel) => sum + channel.revenue, 0) || 0
  const totalOrders = revenueData?.revenue.reduce((sum, channel) => sum + channel.orders, 0) || 0

  // Format revenue for pie chart
  const revenueChartData = revenueData?.revenue.map(item => ({
    name: item.channel,
    value: item.revenue
  })) || []



  const handleDateRangeChange = (range: string) => {
    setDateRange(range as any)
    setFromDate(undefined)
    setToDate(undefined)
  }

  const exportSkusByChannel = () => {
    if (!topSkuData?.topSkus) return

    // Flatten the data: one row per SKU per channel
    const rows: string[] = []
    
    // Header row
    rows.push('Channel,SKU,Units Sold,Revenue,Average Price')
    
    // Data rows - iterate through channels and their SKUs
    topSkuData.topSkus.forEach((channelData: any) => {
      const channel = channelData.channel || 'Unknown'
      if (channelData.topSkus && Array.isArray(channelData.topSkus)) {
        channelData.topSkus.forEach((sku: any) => {
          const skuCode = sku.sku || ''
          const unitsSold = sku.quantity || 0
          const revenue = sku.revenue || 0
          const avgPrice = unitsSold > 0 ? (revenue / unitsSold).toFixed(2) : '0.00'
          
          rows.push(`"${channel}","${skuCode}",${unitsSold},${revenue.toFixed(2)},${avgPrice}`)
        })
      }
    })
    
    // Create blob and download
    const csv = rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `channel-performance-skus-${format(new Date(), 'yyyy-MM-dd')}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (!user) {
    return <div className="text-center py-8">Please log in to view channel performance</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Channel Performance</h1>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-center flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => handleDateRangeChange('today')}
              className={`px-4 py-2 rounded ${dateRange === 'today' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Today
            </button>
            <button
              onClick={() => handleDateRangeChange('last7')}
              className={`px-4 py-2 rounded ${dateRange === 'last7' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleDateRangeChange('last30')}
              className={`px-4 py-2 rounded ${dateRange === 'last30' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handleDateRangeChange('custom')}
              className={`px-4 py-2 rounded ${dateRange === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Custom
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-2">
              <input
                type="date"
                value={fromDate || ''}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-2 border rounded"
              />
              <input
                type="date"
                value={toDate || ''}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-2 border rounded"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Total Revenue</h3>
          <p className="text-3xl font-bold mt-2">${totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Total Orders</h3>
          <p className="text-3xl font-bold mt-2">{totalOrders.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium">Average Order Value</h3>
          <p className="text-3xl font-bold mt-2">${totalOrders > 0 ? (totalRevenue / totalOrders).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '0'}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue by Channel - Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue Distribution by Channel</h2>
          {loadingRevenue ? (
            <div className="flex justify-center items-center h-80">Loading...</div>
          ) : revenueChartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueChartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex justify-center items-center h-80 text-gray-500">No data available</div>
          )}
        </div>

        {/* Revenue by Channel - Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue by Channel</h2>
          {loadingRevenue ? (
            <div className="flex justify-center items-center h-80">Loading...</div>
          ) : revenueData?.revenue && revenueData.revenue.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData.revenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                  <YAxis label={{ value: 'Revenue ($)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex justify-center items-center h-80 text-gray-500">No data available</div>
          )}
        </div>
      </div>

      {/* Channel Details Table */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Channel Performance Details</h2>
        {loadingRevenue ? (
          <div className="text-center py-8">Loading...</div>
        ) : revenueData?.revenue && revenueData.revenue.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Channel</th>
                  <th className="text-right py-2 px-4">Revenue</th>
                  <th className="text-right py-2 px-4">Orders</th>
                  <th className="text-right py-2 px-4">Items Sold</th>
                  <th className="text-right py-2 px-4">Avg Order Value</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.revenue.map((channel, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{channel.channel}</td>
                    <td className="text-right py-3 px-4">${channel.revenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                    <td className="text-right py-3 px-4">{channel.orders}</td>
                    <td className="text-right py-3 px-4">{channel.items}</td>
                    <td className="text-right py-3 px-4">${(channel.revenue / channel.orders).toLocaleString('en-US', { maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No data available</div>
        )}
      </div>

      {/* Top SKUs by Channel */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Top SKUs by Channel</h2>
          <button
            onClick={exportSkusByChannel}
            disabled={!topSkuData?.topSkus || topSkuData.topSkus.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
        {loadingTopSkus ? (
          <div className="text-center py-8">Loading...</div>
        ) : topSkuData?.topSkus && topSkuData.topSkus.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topSkuData.topSkus.map((channelData, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-3">{channelData.channel}</h3>
                <div className="space-y-2">
                  {channelData.topSkus.map((sku, skuIdx) => (
                    <div key={skuIdx} className="flex justify-between text-sm pb-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium">{sku.sku}</p>
                        <p className="text-gray-600 text-xs">{sku.quantity} units</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${sku.revenue.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No data available</div>
        )}
      </div>
    </div>
  )
}
