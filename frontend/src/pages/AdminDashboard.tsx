import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { membershipService } from '../api/membershipService';
import { Users, Crown, Settings, TrendingUp, Shield, Star, Zap } from 'lucide-react';

export default function AdminDashboard() {
  // Get customers with membership info for admin overview
  const { data: customerStats, isLoading } = useQuery({
    queryKey: ['adminCustomerStats'],
    queryFn: () => membershipService.getAllCustomersWithMembership(),
  });

  const getMembershipStats = () => {
    if (!customerStats) {
      return { 
        total: 0, 
        byTier: { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>
      };
    }
    
    const stats = {
      total: customerStats.length,
      byTier: {
        1: customerStats.filter(c => c.membershipLevel === 1).length,
        2: customerStats.filter(c => c.membershipLevel === 2).length,
        3: customerStats.filter(c => c.membershipLevel === 3).length,
        4: customerStats.filter(c => c.membershipLevel === 4).length,
      } as Record<number, number>
    };
    
    return stats;
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
      case 1: return 'from-gray-500 to-gray-600'
      case 2: return 'from-blue-500 to-blue-600'
      case 3: return 'from-yellow-500 to-yellow-600'
      case 4: return 'from-purple-500 to-purple-600'
      default: return 'from-gray-500 to-gray-600'
    }
  };

  const stats = getMembershipStats();

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
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="w-8 h-8 text-gray-600" />
            <h1 className="text-3xl font-bold text-gray-900">Administrative Dashboard</h1>
          </div>
          <p className="text-gray-600">
            System overview and management tools for SkuVault SaaS platform.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Customers */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          {/* Basic Tier */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className={`p-3 bg-gradient-to-r ${getTierColor(1)} rounded-lg`}>
                {getTierIcon(1)}
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Basic Tier</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.byTier[1] || 0}</p>
              </div>
            </div>
          </div>

          {/* Standard Tier */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className={`p-3 bg-gradient-to-r ${getTierColor(2)} rounded-lg`}>
                {getTierIcon(2)}
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Standard Tier</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.byTier[2] || 0}</p>
              </div>
            </div>
          </div>

          {/* Premium Tier */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className={`p-3 bg-gradient-to-r ${getTierColor(3)} rounded-lg`}>
                {getTierIcon(3)}
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Premium Tier</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.byTier[3] || 0}</p>
              </div>
            </div>
          </div>

          {/* Enterprise Tier */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center">
              <div className={`p-3 bg-gradient-to-r ${getTierColor(4)} rounded-lg`}>
                {getTierIcon(4)}
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Enterprise Tier</h3>
                <p className="text-2xl font-bold text-gray-900">{stats.byTier[4] || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Customer Management */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <Users className="w-8 h-8 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Customer Management</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Manage customer accounts, membership levels, and view detailed customer information.
            </p>
            <div className="space-y-2">
              <Link
                to="/admin/customers"
                className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Manage Customers
              </Link>
            </div>
          </div>

          {/* Tier Configuration */}
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <Crown className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900 ml-3">Tier Configuration</h3>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Configure membership tiers, features, and report access requirements.
            </p>
            <div className="space-y-2">
              <Link
                to="/admin/tiers"
                className="block w-full text-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Configure Tiers
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 ml-3">Platform Overview</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Membership Distribution</h4>
                <div className="space-y-2">
                  {[
                    { tier: 1, name: 'Basic', count: stats.byTier[1] || 0, color: 'bg-gray-200' },
                    { tier: 2, name: 'Standard', count: stats.byTier[2] || 0, color: 'bg-blue-200' },
                    { tier: 3, name: 'Premium', count: stats.byTier[3] || 0, color: 'bg-yellow-200' },
                    { tier: 4, name: 'Enterprise', count: stats.byTier[4] || 0, color: 'bg-purple-200' },
                  ].map((tier) => {
                    const percentage = stats.total > 0 ? ((tier.count / stats.total) * 100).toFixed(1) : '0';
                    return (
                      <div key={tier.tier} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full ${tier.color} mr-2`}></div>
                          <span className="text-sm text-gray-600">{tier.name}</span>
                        </div>
                        <div className="text-sm font-medium text-gray-900">
                          {tier.count} ({percentage}%)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Administrative Features</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Multi-tenant customer isolation
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Tiered membership system
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Real-time report access control
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Customer membership management
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                    Configurable tier requirements
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}