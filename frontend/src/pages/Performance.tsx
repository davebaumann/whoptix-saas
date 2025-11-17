import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Package, BarChart3, Target, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import WithMembershipCheck from '../components/WithMembershipCheck';

const PerformanceContent: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30days');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: performanceData, isLoading, error, refetch } = useQuery({
    queryKey: ['performance-report', selectedTimeframe],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/reports/customer/1/performance`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  useEffect(() => {
    const interval = autoRefresh ? setInterval(() => refetch(), 30000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refetch]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading performance data</h3>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!performanceData || !performanceData.summary) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No performance data available</h3>
        <p className="mt-1 text-sm text-gray-500">Performance metrics will appear here once you have inventory movements.</p>
      </div>
    );
  }

  const { summary, velocityMetrics, turnoverMetrics, trends, topPerformers, underPerformers } = performanceData;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getTrendIcon = (value: number) => {
    return value >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getTrendColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Performance Report
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track inventory velocity, turnover rates, and product performance metrics
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Auto-refresh</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Total Revenue</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {formatCurrency(summary.totalRevenue)}
          </dd>
          <div className="mt-2 flex items-center text-sm">
            {getTrendIcon(summary.revenueGrowth)}
            <span className={`ml-1 ${getTrendColor(summary.revenueGrowth)}`}>
              {formatPercentage(summary.revenueGrowth)}
            </span>
            <span className="ml-1 text-gray-500">vs previous period</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Average Velocity</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {summary.averageVelocity.toFixed(1)} <span className="text-lg text-gray-500">units/day</span>
          </dd>
          <div className="mt-2 flex items-center text-sm text-gray-600">
            <Activity className="h-4 w-4 mr-1" />
            <span>{summary.totalMovements} total movements</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Fast Movers</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-green-600">
            {summary.fastMovers}
          </dd>
          <div className="mt-2 flex items-center text-sm text-gray-600">
            <Target className="h-4 w-4 mr-1" />
            <span>{summary.slowMovers} slow movers</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
          <dt className="truncate text-sm font-medium text-gray-500">Average Turnover</dt>
          <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {summary.averageTurnover.toFixed(2)}x
          </dd>
          <div className="mt-2 flex items-center text-sm text-gray-600">
            <BarChart3 className="h-4 w-4 mr-1" />
            <span>{summary.totalProducts} active products</span>
          </div>
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Performance Trends</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(trends.salesGrowth)}
              </div>
              <div className="text-sm text-gray-500">Sales Growth</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatPercentage(trends.revenueGrowth)}
              </div>
              <div className="text-sm text-gray-500">Revenue Growth</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {trends.activeProducts}
              </div>
              <div className="text-sm text-gray-500">Active Products</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Velocity Metrics */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Top Velocity Products</h3>
            <div className="overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Velocity</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {velocityMetrics?.slice(0, 10).map((metric: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="text-sm font-medium text-gray-900">{metric.productSku}</div>
                        <div className="text-sm text-gray-500 truncate">{metric.productName}</div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {metric.velocity.toFixed(1)}/day
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {formatNumber(metric.currentStock)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {metric.daysOfStock === 999 ? '∞' : metric.daysOfStock.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Top Revenue Performers</h3>
            <div className="overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topPerformers?.map((performer: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="text-sm font-medium text-gray-900">{performer.productSku}</div>
                        <div className="text-sm text-gray-500 truncate">{performer.productName}</div>
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-green-600">
                        {formatCurrency(performer.revenue)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {formatNumber(performer.unitsSold)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Turnover Metrics */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Turnover Analysis</h3>
            <div className="overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {turnoverMetrics?.slice(0, 10).map((metric: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="text-sm font-medium text-gray-900">{metric.productSku}</div>
                        <div className="text-sm text-gray-500 truncate">{metric.productName}</div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {metric.turnoverRate.toFixed(2)}x
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-gray-900">
                        {formatCurrency(metric.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Under Performers */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
                Under Performers
              </div>
            </h3>
            <div className="overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {underPerformers?.map((performer: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="text-sm font-medium text-gray-900">{performer.productSku}</div>
                        <div className="text-sm text-gray-500 truncate">{performer.productName}</div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        {formatNumber(performer.stockQuantity)}
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-orange-600">
                        {formatCurrency(performer.stockValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Performance: React.FC = () => {
  return (
    <WithMembershipCheck reportName="performance" reportDisplayName="Performance Analytics">
      <PerformanceContent />
    </WithMembershipCheck>
  );
};

export default Performance;
