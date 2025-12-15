import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Activity, TrendingUp, Calendar } from 'lucide-react';

interface UsageData {
  period: string;
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    totalTransactions: number;
    averageTransactionsPerCustomer: number;
  };
  membershipDistribution: Array<{
    Level: string;
    Count: number;
    Percentage: number;
  }>;
  topCustomersByActivity: Array<{
    Id: number;
    Name: string;
    Email: string;
    MembershipLevel: string;
    TransactionCount: number;
  }>;
  activityTrends: Array<{
    Date: string;
    TransactionCount: number;
    UniqueCustomers: number;
  }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const UsageAnalytics: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  const { data: usageData, isLoading, error } = useQuery<UsageData>({
    queryKey: ['usageAnalytics', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/usageanalytics?days=${selectedPeriod}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch usage analytics');
      return response.json();
    },
    refetchInterval: 300000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-red-200">
        <div className="flex items-center mb-4">
          <Activity className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 ml-3">Usage Analytics</h3>
        </div>
        <div className="text-red-600">Failed to load usage analytics</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-900 ml-3">Usage Analytics</h3>
          </div>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(Number(e.target.value))}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>
      
      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <h4 className="text-sm font-medium text-gray-900 ml-2">Total Customers</h4>
            </div>
            <div className="text-2xl font-bold text-gray-900">{usageData?.summary.totalCustomers}</div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <h4 className="text-sm font-medium text-gray-900 ml-2">Active Customers</h4>
            </div>
            <div className="text-2xl font-bold text-gray-900">{usageData?.summary.activeCustomers}</div>
            <div className="text-xs text-gray-600">
              {usageData?.summary.totalCustomers ? 
                Math.round((usageData.summary.activeCustomers / usageData.summary.totalCustomers) * 100) : 0}% of total
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <h4 className="text-sm font-medium text-gray-900 ml-2">Total Transactions</h4>
            </div>
            <div className="text-2xl font-bold text-gray-900">{usageData?.summary.totalTransactions?.toLocaleString() || '0'}</div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              <h4 className="text-sm font-medium text-gray-900 ml-2">Avg per Customer</h4>
            </div>
            <div className="text-2xl font-bold text-gray-900">{usageData?.summary.averageTransactionsPerCustomer}</div>
            <div className="text-xs text-gray-600">transactions</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Membership Distribution */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Membership Distribution</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={usageData?.membershipDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.Level}: ${entry.Percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="Count"
                >
                  {usageData?.membershipDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Trends */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Daily Activity Trends</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={usageData?.activityTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="Date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Bar dataKey="TransactionCount" fill="#8884d8" name="Transactions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Customers */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Most Active Customers</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Membership</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Transactions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {usageData?.topCustomersByActivity?.map((customer) => (
                  <tr key={customer.Id}>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{customer.Name}</div>
                        <div className="text-sm text-gray-500">{customer.Email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        customer.MembershipLevel === 'Basic' ? 'bg-gray-100 text-gray-800' :
                        customer.MembershipLevel === 'Standard' ? 'bg-blue-100 text-blue-800' :
                        customer.MembershipLevel === 'Premium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {customer.MembershipLevel}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      {customer.TransactionCount?.toLocaleString() || '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageAnalytics;