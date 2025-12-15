import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, BarChart3, TrendingUp, Calendar, User } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PackerPerformanceDetailProps {
  customerId: number;
  packerName: string;
  onClose: () => void;
  dateRange?: { from?: string; to?: string };
}

const PackerPerformanceDetail: React.FC<PackerPerformanceDetailProps> = ({
  customerId,
  packerName,
  onClose,
  dateRange
}) => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['packer-detail', customerId, packerName, period, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        ...(dateRange?.from && { from: dateRange.from }),
        ...(dateRange?.to && { to: dateRange.to })
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/PackerPerformance/customer/${customerId}/packer/${encodeURIComponent(packerName)}?${params}`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch packer performance data');
      }

      return response.json();
    }
  });

  // Map backend response to chart data
  const formatChartData = (data: any[]) => {
    return data.map(item => ({
      ...item,
      name:
        period === 'day'
          ? item.date
          : period === 'week'
          ? `${item.weekStart} - ${item.weekEnd}`
          : item.month
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{packerName} Performance</h2>
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
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Transactions</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {performanceData?.summary?.totalTransactions?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Total Quantity</p>
                      <p className="text-2xl font-bold text-green-900">
                        {performanceData?.summary?.totalQuantity?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <Calendar className="h-8 w-8 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Average Per Day</p>
                      <p className="text-2xl font-bold text-purple-900">
                        {Math.round(performanceData?.summary?.averagePerDay || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                      P
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-orange-600">Pick/Pack Ratio</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {performanceData?.summary?.pickCount || 0}/{performanceData?.summary?.packCount || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Chart - dynamic by period */}
              <div className="bg-white border rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Performance Over Time ({period})
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    {period === 'day' ? (
                      <BarChart data={formatChartData(performanceData?.performanceData || [])}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} height={60} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="totalTransactions" fill="#3B82F6" name="Transactions" />
                      </BarChart>
                    ) : period === 'week' ? (
                      <LineChart data={formatChartData(performanceData?.performanceData || [])}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} height={60} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="totalTransactions" stroke="#10B981" name="Hourly Transactions" />
                      </LineChart>
                    ) : (
                      <BarChart data={formatChartData(performanceData?.performanceData || [])}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} height={60} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="totalTransactions" fill="#F59E0B" name="Daily Transactions" />
                      </BarChart>
                    )}
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
                          {period === 'day' ? 'Date' : period === 'week' ? 'Week' : 'Month'}
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
                          Packs
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Receives
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Other
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(performanceData?.performanceData || []).map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {period === 'day' ? new Date(item.date).toLocaleDateString() :
                             period === 'week' ? `${new Date(item.weekStart).toLocaleDateString()} - ${new Date(item.weekEnd).toLocaleDateString()}` :
                             new Date(item.month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">
                            {item.packCount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                            {item.receiveCount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.otherCount.toLocaleString()}
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

export default PackerPerformanceDetail;