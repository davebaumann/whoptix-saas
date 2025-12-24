import React, { useState } from 'react';
// import PackerPerformanceDetail from '../components/PackerPerformanceDetail';
import { TrendingUp, TrendingDown, Activity, Package, BarChart3, AlertTriangle, ShoppingCart, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import WithMembershipCheck from '../components/WithMembershipCheck';
import { useAuth } from '../contexts/AuthContext';

const PerformanceContent: React.FC = () => {
  const { user } = useAuth()
  const [selectedTimeframe, setSelectedTimeframe] = useState('30days');
  const customerId = user?.customerId || 1
  const [pickerModal, setPickerModal] = useState<{ pickerName: string | null }>({ pickerName: null });

  const { data: performanceData, isLoading, error } = useQuery({
    queryKey: ['performance-report', customerId, selectedTimeframe],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/reports/customer/${customerId}/performance?timeframe=${selectedTimeframe}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch performance data');
      }

      return response.json();
    },
    refetchInterval: 300000, // 5 minutes
  });

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

  const getPerformanceRating = (value: number, type: 'velocity' | 'turnover' | 'growth') => {
    let thresholds = { excellent: 0, good: 0, average: 0, poor: 0 };
    
    switch (type) {
      case 'velocity':
        thresholds = { excellent: 10, good: 5, average: 1, poor: 0 };
        break;
      case 'turnover':
        thresholds = { excellent: 6, good: 4, average: 2, poor: 0 };
        break;
      case 'growth':
        thresholds = { excellent: 10, good: 5, average: 0, poor: -10 };
        break;
    }

    if (value >= thresholds.excellent) return { rating: 'Excellent', color: 'text-green-600 bg-green-100' };
    if (value >= thresholds.good) return { rating: 'Good', color: 'text-blue-600 bg-blue-100' };
    if (value >= thresholds.average) return { rating: 'Average', color: 'text-yellow-600 bg-yellow-100' };
    return { rating: 'Poor', color: 'text-red-600 bg-red-100' };
  };

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

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Performance Dashboard
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Track inventory velocity, turnover rates, and product performance metrics
          </p>
        </div>
        <div className="mt-4 flex md:ml-4 md:mt-0 space-x-3 flex-wrap gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTimeframe('7days')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeframe === '7days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setSelectedTimeframe('30days')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeframe === '30days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setSelectedTimeframe('90days')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTimeframe === '90days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Last 90 Days
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3 w-0 flex-1">
              <dt className="truncate text-sm font-medium text-gray-500">Units Sold</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">
                {formatNumber(summary.unitsSold)}
              </dd>
              <div className="mt-2 flex items-center text-sm">
                {getTrendIcon(summary.unitsSoldGrowth || 0)}
                <span className={`ml-1 font-semibold ${getTrendColor(summary.unitsSoldGrowth || 0)}`}>
                  {formatPercentage(summary.unitsSoldGrowth || 0)}
                </span>
                <span className="ml-1 text-gray-500">vs last period</span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-3 w-0 flex-1">
              <dt className="truncate text-sm font-medium text-gray-500">Avg Velocity</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">
                {velocityMetrics?.averageVelocity?.toFixed(1) || '0.0'}<span className="text-sm text-gray-500">/day</span>
              </dd>
              <div className="mt-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceRating(velocityMetrics?.averageVelocity || 0, 'velocity').color}`}>
                  {getPerformanceRating(velocityMetrics?.averageVelocity || 0, 'velocity').rating}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 border-l-4 border-orange-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-3 w-0 flex-1">
              <dt className="truncate text-sm font-medium text-gray-500">Avg Turnover</dt>
              <dd className="mt-1 text-2xl font-bold text-gray-900">
                {turnoverMetrics?.averageTurnover?.toFixed(1) || '0.0'}<span className="text-sm text-gray-500">x</span>
              </dd>
              <div className="mt-2">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPerformanceRating(turnoverMetrics?.averageTurnover || 0, 'turnover').color}`}>
                  {getPerformanceRating(turnoverMetrics?.averageTurnover || 0, 'turnover').rating}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Performance Trends</h3>
          <div className="space-y-2">
            {trends?.slice(0, 3).map((trend: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    trend.direction === 'up' ? 'bg-green-500' : 
                    trend.direction === 'down' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-xs text-gray-600">{trend.metric}</span>
                </div>
                <span className={`text-xs font-semibold ${getTrendColor(trend.change)}`}>
                  {formatPercentage(trend.change)}
                </span>
              </div>
            )) || (
              <div className="text-center py-2 text-xs text-gray-500">
                No trend data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Velocity Distribution</h3>
          <div className="space-y-4">
            {velocityMetrics && (
              <>
                {(() => {
                  const fast = velocityMetrics.fastMovingCount || 0;
                  const medium = velocityMetrics.mediumMovingCount || 0;
                  const slow = velocityMetrics.slowMovingCount || 0;
                  const total = fast + medium + slow;
                  
                  return (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-600">Fast Moving (≥10/day)</span>
                        <div className="flex items-center flex-shrink-0">
                          <span className="text-sm font-semibold text-green-600 mr-2 min-w-fit">
                            {fast}
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2 flex-shrink-0">
                            <div 
                              className="bg-green-500 h-2 rounded-full" 
                              style={{ 
                                width: `${total > 0 ? (fast / total * 100) : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-600">Medium Moving (5-10/day)</span>
                        <div className="flex items-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-600 mr-2 min-w-fit">
                            {medium}
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2 flex-shrink-0">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ 
                                width: `${total > 0 ? (medium / total * 100) : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-600">Slow Moving (1-5/day)</span>
                        <div className="flex items-center flex-shrink-0">
                          <span className="text-sm font-semibold text-yellow-600 mr-2 min-w-fit">
                            {slow}
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2 flex-shrink-0">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full" 
                              style={{ 
                                width: `${total > 0 ? (slow / total * 100) : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-600">Dead Stock (&lt;1/day)</span>
                        <div className="flex items-center flex-shrink-0">
                          <span className="text-sm font-semibold text-red-600 mr-2 min-w-fit">
                            {velocityMetrics?.deadStockCount || 0}
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2 flex-shrink-0">
                            <div 
                              className="bg-red-500 h-2 rounded-full" 
                              style={{ 
                                width: `${total > 0 ? ((velocityMetrics?.deadStockCount || 0) / total * 100) : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Turnover Analysis</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Average Turnover Rate</span>
              <span className="text-2xl font-bold text-gray-900">
                {turnoverMetrics?.averageTurnover?.toFixed(2) || '0.00'}x
              </span>
            </div>
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-700">
              <p className="font-medium">What is Turnover?</p>
              <p className="mt-1">The number of times inventory is sold and replaced. Higher = faster moving products.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Stock Coverage</span>
              <span className="text-sm font-semibold text-gray-900">
                {Math.round(summary.averageStockCoverage || 0)} days
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Active SKUs</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatNumber(summary.activeSKUs || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Zero Stock SKUs</span>
              <span className="text-sm font-semibold text-red-600">
                {formatNumber(summary.zeroStockSKUs || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Total Transactions</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatNumber(summary.totalTransactions || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top and Under Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Top Performers</h3>
            <div className="mt-5">
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {topPerformers?.slice(0, 5).map((performer: any, index: number) => (
                    <li key={index} className="py-4 cursor-pointer hover:bg-blue-50 rounded" onClick={() => setPickerModal({ pickerName: performer.sku })}>
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {performer.sku}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatNumber(performer.unitsSold)} units sold • {performer.velocity?.toFixed(1)} units/day
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-sm text-green-600 font-semibold">
                          {formatCurrency(performer.revenue)}
                        </div>
                      </div>
                    </li>
                  )) || (
                    <li className="py-4 text-center text-gray-500">
                      No performance data available
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Under Performers</h3>
            <div className="mt-5">
              <div className="flow-root">
                <ul className="-my-5 divide-y divide-gray-200">
                  {underPerformers?.slice(0, 5).map((performer: any, index: number) => (
                    <li key={index} className="py-4 cursor-pointer hover:bg-red-50 rounded" onClick={() => setPickerModal({ pickerName: performer.sku })}>
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {performer.sku}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatNumber(performer.currentStock)} in stock • {performer.daysOnHand ? Math.round(performer.daysOnHand) : 'N/A'} days on hand
                          </p>
                        </div>
                        <div className="flex-shrink-0 text-sm text-red-600 font-semibold">
                          {performer.velocity?.toFixed(1) || '0.0'}/day
                        </div>
                      </div>
                    </li>
                  )) || (
                    <li className="py-4 text-center text-gray-500">
                      No performance data available
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PickerPerformanceDetail Modal (implement or import as needed) */}
      {pickerModal.pickerName && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-bold mb-2">Picker Details</h2>
            <p>Picker: {pickerModal.pickerName}</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded" onClick={() => setPickerModal({ pickerName: null })}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Performance: React.FC = () => {
  return (
    <WithMembershipCheck reportName="performance" reportDisplayName="Performance Report">
      <PerformanceContent />
    </WithMembershipCheck>
  );
};

export default Performance;