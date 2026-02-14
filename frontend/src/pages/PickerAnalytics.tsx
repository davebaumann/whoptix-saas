import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import WithMembershipCheck from '../components/WithMembershipCheck'
import { AlertCircle, Info } from 'lucide-react'

interface Tooltip {
  [key: string]: string
}

const METRIC_TOOLTIPS: Tooltip = {
  pickAccuracy: 'Average percentage of orders picked correctly across all pickers. Calculated as the mean of individual picker accuracy rates.',
  avgProcessingTime: 'Average time in minutes per order to complete picking. Calculated from total picks and total units picked.',
  pickRate: 'Average number of units picked per day across all pickers during the period.',
  onTimeShipRate: 'Percentage of orders shipped on time after picking. Requires shipment tracking data.',
  unitsPicked: 'Total number of units picked during the selected time period.',
  shift: 'Morning (6am-2pm), Afternoon (2pm-10pm), or Night (10pm-6am) based on transaction timestamp.',
  accuracy: 'Individual picker accuracy rate. Percentage of picks completed correctly without errors or reversals.',
  avgTimePerUnit: 'Average seconds spent picking per unit. Lower values indicate faster picking performance.',
  avgAccuracy: 'Average pick accuracy for all pickers assigned to this shift.',
  unitsProcessed: 'Total number of units picked during this shift.'
}

const PickerAnalyticsContent: React.FC = () => {
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null)
  const [sortField, setSortField] = useState<string>('unitsPicked')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const { user } = useAuth()
  // Check if admin is viewing as another customer
  const adminViewingData = sessionStorage.getItem('adminViewingAs');
  const adminViewingCustomerId = adminViewingData ? JSON.parse(adminViewingData).customerId : null;
  
  // Use impersonated customer ID if admin is viewing as, otherwise use user's own customer ID
  const customerId = adminViewingCustomerId || user?.customerId || 1

  const renderTooltip = (key: string) => (
    <div className="relative group inline-block ml-1">
      <Info 
        className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help inline"
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortableHeader = ({ field, label }: { field: string; label: string }) => (
    <th 
      onClick={() => handleSort(field)}
      className="px-6 py-3 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
    >
      <div className="flex items-center justify-end gap-1">
        <span>{label}</span>
        {sortField === field && (
          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  )

  const { data: pickerData, isLoading, error } = useQuery({
    queryKey: ['picker-analytics', customerId],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/reports/customer/${customerId}/picker-analytics`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch picker analytics')
      }

      return response.json()
    },
    refetchInterval: 300000, // 5 minutes
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">
              {error instanceof Error ? error.message : 'Failed to load picker analytics'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!pickerData) {
    return <div className="text-gray-500">No data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Picker Analytics</h1>
        <p className="text-gray-600 mt-1">Individual and shift-level picking performance metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Pick Accuracy</p>
            {renderTooltip('pickAccuracy')}
          </div>
          <p className="text-3xl font-bold text-gray-900">{pickerData.kpis.pickAccuracy.toFixed(2)}%</p>
          <p className="text-xs text-gray-500 mt-1">Orders picked correctly</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Avg Order Processing Time</p>
            {renderTooltip('avgProcessingTime')}
          </div>
          <p className="text-3xl font-bold text-gray-900">{pickerData.kpis.avgProcessingTime.toFixed(1)}min</p>
          <p className="text-xs text-gray-500 mt-1">Per order</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <p className="text-sm font-medium text-gray-600 mb-2">Pick Rate</p>
            {renderTooltip('pickRate')}
          </div>
          <p className="text-3xl font-bold text-gray-900">{pickerData.kpis.pickRate}</p>
          <p className="text-xs text-gray-500 mt-1">Units/hour/picker</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-amber-500">
          <div className="flex items-center">
            <p className="text-sm font-medium text-gray-600 mb-2">On-Time Ship Rate</p>
            {renderTooltip('onTimeShipRate')}
          </div>
          <p className="text-3xl font-bold text-gray-900">{pickerData.kpis.onTimeShipRate > 0 ? `${pickerData.kpis.onTimeShipRate.toFixed(1)}%` : 'N/A'}</p>
          <p className="text-xs text-gray-500 mt-1">Orders shipped on time</p>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pick Performance Trend</h3>
        <div className="space-y-3">
          {pickerData.trends.map((trend: any) => (
            <div key={trend.date} className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 w-20">{trend.date}</span>
              <div className="flex-1 mx-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${trend.accuracy > 98 ? 'bg-green-500' : trend.accuracy > 95 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                    style={{width: `${trend.accuracy}%`}}
                  ></div>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900 w-12 text-right">{trend.accuracy}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Picker Performance Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Staff</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                <SortableHeader field="shift" label={`Shift ${renderTooltip('shift')}`} />
                <SortableHeader field="unitsPicked" label="Units Picked" />
                <SortableHeader field="accuracy" label={`Accuracy ${renderTooltip('accuracy')}`} />
                <SortableHeader field="avgTimePerUnit" label={`Avg Time/Unit ${renderTooltip('avgTimePerUnit')}`} />
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {pickerData.pickerPerformance
                .sort((a: any, b: any) => {
                  let aVal = a[sortField]
                  let bVal = b[sortField]
                  
                  // Handle numeric fields
                  if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
                  }
                  
                  // Handle string fields
                  if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
                  }
                  
                  return 0
                })
                .map((picker: any) => (
                <tr key={picker.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{picker.name}</td>
                  <td className="px-6 py-4 text-right text-gray-600">{picker.shift}</td>
                  <td className="px-6 py-4 text-right text-gray-900 font-semibold">{picker.unitsPicked}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      picker.accuracy > 98 ? 'bg-green-100 text-green-800' :
                      picker.accuracy > 95 ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {picker.accuracy}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-900">{picker.avgTimePerUnit}s</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                      picker.status === 'Active' ? 'bg-green-100 text-green-800' :
                      picker.status === 'Break' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {picker.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">Shift Performance {renderTooltip('avgAccuracy')}</h3>
          <div className="space-y-3">
            {pickerData.shiftPerformance.map((shift: any) => (
              <div key={shift.name} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{shift.name}</p>
                  <p className="text-xs text-gray-500">{shift.pickers} pickers</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{(typeof shift.avgAccuracy === 'number' ? shift.avgAccuracy.toFixed(1) : shift.avgAccuracy)}%</p>
                  <p className="text-xs text-gray-500">{shift.unitsProcessed} units {renderTooltip('unitsProcessed')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 overflow-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exception Types</h3>
          <div className="space-y-3">
            {pickerData.exceptions.map((exc: any) => (
              <div key={exc.type} className="flex items-center gap-3 min-w-0">
                <span className="text-gray-600 flex-1 min-w-0 truncate">{exc.type}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-2 rounded-full ${
                        exc.count > 15 ? 'bg-red-500' :
                        exc.count > 10 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{width: `${(exc.count / 20) * 100}%`}}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8 text-right flex-shrink-0">{exc.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-800">
              <strong>Enterprise Feature:</strong> This report shows detailed picker performance analytics including individual accuracy, pick rate, time per unit, and shift-level comparisons. Monitor staff productivity to identify training opportunities and optimize workforce scheduling.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const PickerAnalytics: React.FC = () => {
  return (
    <WithMembershipCheck reportName="picker-analytics" reportDisplayName="Picker Analytics">
      <PickerAnalyticsContent />
    </WithMembershipCheck>
  )
}

export default PickerAnalytics
