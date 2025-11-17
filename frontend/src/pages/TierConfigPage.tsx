import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipService } from '../api/membershipService';
import { Crown, Shield, Star, Zap, Settings, Save, Edit } from 'lucide-react';

const TierConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedReportAccess, setEditedReportAccess] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['membershipTiers'],
    queryFn: () => membershipService.getMembershipTiers(),
  });

  // Initial report access configuration
  const reportAccess = {
    'inventory': { tier: 1, name: 'Inventory Report', description: 'Basic inventory tracking and stock levels' },
    'low-stock': { tier: 2, name: 'Low Stock Report', description: 'Automated low stock alerts and notifications' },
    'aging-inventory': { tier: 3, name: 'Aging Inventory Report', description: 'Track inventory age and identify slow-moving stock' },
    'financial-warehouse': { tier: 3, name: 'Financial Warehouse Report', description: 'Financial analytics and warehouse value tracking' },
    'locations': { tier: 3, name: 'Locations Report', description: 'Location utilization and optimization insights' },
    'performance': { tier: 4, name: 'Performance Analytics', description: 'Advanced metrics including velocity, turnover, and trends' }
  };

  // Initialize edited state with current values
  React.useEffect(() => {
    if (!isEditing) {
      const currentAccess: Record<string, number> = {};
      Object.entries(reportAccess).forEach(([key, config]) => {
        currentAccess[key] = config.tier;
      });
      setEditedReportAccess(currentAccess);
    }
  }, [isEditing]);

  const updateReportAccessMutation = useMutation({
    mutationFn: async (newAccess: Record<string, number>) => {
      // This would call a backend API to update the ReportAccessService configuration
      // For now, we'll simulate the API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return newAccess;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membershipTiers'] });
      setIsEditing(false);
    },
  });

  const handleTierChange = (reportKey: string, newTier: number) => {
    setEditedReportAccess(prev => ({
      ...prev,
      [reportKey]: newTier
    }));
  };

  const handleSave = () => {
    updateReportAccessMutation.mutate(editedReportAccess);
  };

  const getTierIcon = (level: number) => {
    switch (level) {
      case 1: return <Shield className="w-6 h-6 text-gray-500" />
      case 2: return <Star className="w-6 h-6 text-blue-500" />
      case 3: return <Crown className="w-6 h-6 text-yellow-500" />
      case 4: return <Zap className="w-6 h-6 text-purple-500" />
      default: return <Shield className="w-6 h-6 text-gray-500" />
    }
  };

  const getTierColor = (level: number) => {
    switch (level) {
      case 1: return 'border-gray-200 bg-gray-50'
      case 2: return 'border-blue-200 bg-blue-50'
      case 3: return 'border-yellow-200 bg-yellow-50'
      case 4: return 'border-purple-200 bg-purple-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <Settings className="w-8 h-8 text-gray-600" />
              <h1 className="text-3xl font-bold text-gray-900">Membership Tier Configuration</h1>
            </div>
            {activeTab === 'reports' && (
              <div className="flex space-x-2">
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Access</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={updateReportAccessMutation.isPending}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{updateReportAccessMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <p className="text-gray-600">
            Configure membership tiers and their associated features and reports.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tier Overview
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Report Access Matrix
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {tiers?.map((tier) => (
              <div
                key={tier.level}
                className={`rounded-lg border-2 p-6 ${getTierColor(tier.level)}`}
              >
                <div className="flex items-center space-x-3 mb-4">
                  {getTierIcon(tier.level)}
                  <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
                </div>
                
                <p className="text-gray-600 text-sm mb-4">{tier.description}</p>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 text-sm">Features:</h4>
                  <ul className="space-y-1">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-start">
                        <span className="w-1 h-1 bg-gray-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Report Access Matrix</h3>
              <p className="text-sm text-gray-500 mt-1">
                {isEditing 
                  ? 'Edit which reports are available at each membership tier' 
                  : 'Shows which reports are available at each membership tier'
                }
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Required Tier
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Basic
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Standard
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Premium
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(reportAccess).map(([reportKey, report]) => {
                    const currentTier = isEditing ? editedReportAccess[reportKey] : report.tier;
                    return (
                      <tr key={reportKey}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{report.name}</div>
                            <div className="text-sm text-gray-500">{report.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {isEditing ? (
                            <select
                              value={currentTier}
                              onChange={(e) => handleTierChange(reportKey, parseInt(e.target.value))}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                            >
                              <option value={1}>Basic</option>
                              <option value={2}>Standard</option>
                              <option value={3}>Premium</option>
                              <option value={4}>Enterprise</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              currentTier === 1 ? 'bg-gray-100 text-gray-800' :
                              currentTier === 2 ? 'bg-blue-100 text-blue-800' :
                              currentTier === 3 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {currentTier === 1 ? 'Basic' : currentTier === 2 ? 'Standard' : currentTier === 3 ? 'Premium' : 'Enterprise'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            currentTier <= 1 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {currentTier <= 1 ? '✓' : '✗'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            currentTier <= 2 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {currentTier <= 2 ? '✓' : '✗'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            currentTier <= 3 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {currentTier <= 3 ? '✓' : '✗'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            <strong>Admin Features:</strong>
            <br />• Edit report access requirements by tier
            <br />• View comprehensive tier overview with features
            <br />• Manage customer membership levels in the Customer Management section
            <br />• Changes take effect immediately for all users
          </p>
        </div>
      </div>
    </div>
  );
};

export default TierConfigPage;