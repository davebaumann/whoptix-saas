import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, BarChart3, TrendingUp, Calendar, User, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfToday, subDays } from 'date-fns';
import { apiClient } from '../api/client';

interface PickerTooltip {
  [key: string]: string
}

const PICKER_METRIC_TOOLTIPS: PickerTooltip = {
  totalTransactions: 'Total count of all transactions (picks, adds, removes, etc.) performed by this picker during the selected period',
  totalQuantity: 'Sum of all item quantities affected by this picker\'s transactions during the selected period',
  averagePerDay: 'Average number of transactions per day this picker performed during the selected period',
  picksPerHour: 'Average number of picks (inventory removals) per hour - a measure of this picker\'s productivity'
}

interface PickerPerformanceDetailProps {
  customerId: number;
  pickerName: string;
  onClose: () => void;
  dateRange?: { from?: string; to?: string };
}

const PickerPerformanceDetail: React.FC<PickerPerformanceDetailProps> = ({
  customerId,
  pickerName,
  onClose,
  dateRange
}) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

  const renderTooltip = (key: string) => (
    <div className="relative group inline-block">
      <Info 
        className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help inline"
        onMouseEnter={() => setHoveredTooltip(key)}
        onMouseLeave={() => setHoveredTooltip(null)}
      />
      {hoveredTooltip === key && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded p-2 z-20 pointer-events-none">
          {PICKER_METRIC_TOOLTIPS[key]}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );

  // Calculate date range based on selected period
  const calculatedDateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'day':
        return {
          from: format(startOfToday(), 'yyyy-MM-dd'),
          to: format(now, "yyyy-MM-dd'T'HH:mm:ss")
        };
      case 'week':
        return {
          from: format(subDays(now, 7), 'yyyy-MM-dd'),
          to: format(now, "yyyy-MM-dd'T'HH:mm:ss")
        };
      case 'month':
        return {
          from: format(subDays(now, 30), 'yyyy-MM-dd'),
          to: format(now, "yyyy-MM-dd'T'HH:mm:ss")
        };
      default:
        return dateRange || { from: '', to: '' };
    }
  }, [period, dateRange]);

  const { data: performanceData, isLoading, error } = useQuery({
    queryKey: ['picker-detail', customerId, pickerName, period],
    queryFn: async () => {
      console.log('Fetching picker data:', { customerId, pickerName, period, dateRange: calculatedDateRange });

      const data = await apiClient.getPickerDetail(
        customerId,
        pickerName,
        period,
        calculatedDateRange.from,
        calculatedDateRange.to
      );

      console.log('Received picker data:', data);
      return data;
    }
  });

  // Get chart title based on period
  const getChartTitle = () => {
    switch (period) {
      case 'day':
        return 'Hourly Performance'
      case 'week':
        return 'Daily Performance (Week View)'
      case 'month':
        return 'Daily Performance (Month View)'
      default:
        return 'Performance over Time'
    }
  };

  // Calculate picks per hour based on date range
  const calculatePicksPerHour = () => {
    if (!calculatedDateRange.from || !calculatedDateRange.to) return 0;
    if (!performanceData?.summary?.pickCount) return 0;

    const from = new Date(calculatedDateRange.from);
    const to = new Date(calculatedDateRange.to);
    const hours = Math.max((to.getTime() - from.getTime()) / (1000 * 60 * 60), 1);
    
    return (performanceData.summary.pickCount / hours).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{pickerName} Performance</h2>
              <p className="text-sm text-gray-600">Detailed performance metrics over time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Period Selection */}
          <div className="flex items-center space-x-4 mb-6">
            <span className="text-sm font-medium text-gray-700">View by:</span>
            <div className="flex space-x-2">
              {(['day', 'week', 'month'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800 font-semibold mb-2">Error loading picker data</p>
              <p className="text-red-600 text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
          ) : (
            <>


              {/* No Data Message */}
              {(!performanceData?.summary?.totalTransactions || performanceData.summary.totalTransactions === 0) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center mb-6">
                  <p className="text-yellow-800 font-semibold mb-2">No data found for {pickerName}</p>
                  <p className="text-yellow-600 text-sm">
                    No transactions found for the selected date range ({dateRange?.from} to {dateRange?.to}).
                    Try selecting a different date range or check if the picker name is correct.
                  </p>
                </div>
              )}

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <BarChart3 className="h-8 w-8 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-blue-600">Total Transactions</p>
                        {renderTooltip('totalTransactions')}
                      </div>
                      <p className="text-2xl font-bold text-blue-900">
                        {performanceData?.summary?.totalTransactions?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <TrendingUp className="h-8 w-8 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-green-600">Total Quantity</p>
                        {renderTooltip('totalQuantity')}
                      </div>
                      <p className="text-2xl font-bold text-green-900">
                        {performanceData?.summary?.totalQuantity?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <Calendar className="h-8 w-8 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-purple-600">Average Per Day</p>
                        {renderTooltip('averagePerDay')}
                      </div>
                      <p className="text-2xl font-bold text-purple-900">
                        {Math.round(performanceData?.summary?.averagePerDay || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="h-8 w-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      P
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-orange-600">Picks Per Hour</p>
                        {renderTooltip('picksPerHour')}
                      </div>
                      <p className="text-2xl font-bold text-orange-900">
                        {calculatePicksPerHour()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Chart - dynamic by period */}
              <div className="bg-white border rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {getChartTitle()}
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceData?.performanceData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} height={60} angle={period !== 'day' ? -45 : 0} textAnchor={period !== 'day' ? 'end' : 'middle'} />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="totalTransactions" 
                        stroke={period === 'day' ? '#3B82F6' : '#10B981'} 
                        name={period === 'day' ? 'Hourly Transactions' : 'Daily Transactions'} 
                        strokeWidth={2} 
                        dot={{ r: 4 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Detailed Data Table */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">Detailed Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {period === 'day' ? 'Hour' : 'Date'}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Transactions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Picks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Removes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Adds
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Creates
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(performanceData?.performanceData || []).map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {period === 'day' ? item.name : new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.totalTransactions.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.totalQuantity.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            {item.pickCount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">
                            {item.removeCount?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                            {item.addCount?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                            {item.createCount?.toLocaleString() || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PickerPerformanceDetail;