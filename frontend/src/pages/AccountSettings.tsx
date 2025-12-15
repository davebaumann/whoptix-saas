import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useMembership } from '../contexts/MembershipContext';
import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AccountInfo {
  id: number;
  name: string;
  email: string;
  membershipLevel: string;
  lastSyncedAt: string;
  skuvaultApiKey?: string;
  skuvaultBaseUrl?: string;
}

const SkuVaultCredentialsButton: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: API call to save credentials
      console.log('Saving credentials:', credentials);
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors w-full text-left"
      >
        <span className="text-xl mr-3">🔗</span>
        <div>
          <p className="font-medium text-gray-900">SkuVault Credentials</p>
          <p className="text-sm text-gray-500">Connect your SkuVault account for data sync</p>
        </div>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">SkuVault Credentials</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !credentials.username || !credentials.password}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const { membershipInfo } = useMembership();

  const customerId = user?.customerId || 1;

  // Get account info
  const { data: accountInfo, isLoading } = useQuery<AccountInfo>({
    queryKey: ['accountInfo', customerId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch account info');
      return response.json();
    },

  });

  // Profile data is loaded but not currently editable
  // Future: Add profile editing functionality

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-1">
          Manage your account information, membership, and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{accountInfo?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{accountInfo?.email}</p>
            </div>
            <div className="pt-2">
              <SkuVaultCredentialsButton />
            </div>
          </div>
        </div>

        {/* Membership Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Membership</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Crown className="w-6 h-6 text-yellow-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    {membershipInfo?.currentLevelName || 'Loading...'}
                  </p>
                  <p className="text-sm text-gray-500">Current Plan</p>
                </div>
              </div>
              <Link
                to="/app/membership/upgrade"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Upgrade
              </Link>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Next Renewal</p>
                <p className="font-medium text-gray-900">January 15, 2025</p>
              </div>
              <div>
                <p className="text-gray-500">Monthly Cost</p>
                <p className="font-medium text-gray-900">$49.99</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="mb-2">Available Reports:</p>
              <ul className="space-y-1">
                {membershipInfo?.availableReports?.map((report, index) => (
                  <li key={index} className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span>
                    {report}
                  </li>
                ))}
              </ul>
            </div>
            
            <button className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-xl mr-3">🧾</span>
                  <div>
                    <p className="font-medium text-gray-900">View Receipts</p>
                    <p className="text-sm text-gray-500">Download billing history</p>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/app/low-stock-admin"
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-xl mr-3">⚙️</span>
              <div>
                <p className="font-medium text-gray-900">Low Stock Settings</p>
                <p className="text-sm text-gray-500">Configure thresholds and email notifications</p>
              </div>
            </Link>
            
            <Link
              to="/app/membership/upgrade"
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-xl mr-3">💳</span>
              <div>
                <p className="font-medium text-gray-900">Billing & Payments</p>
                <p className="text-sm text-gray-500">Manage subscription and payment methods</p>
              </div>
            </Link>
            
            <Link
              to="/app/user-management"
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-xl mr-3">👥</span>
              <div>
                <p className="font-medium text-gray-900">User Management</p>
                <p className="text-sm text-gray-500">Invite and manage team members</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Security</h2>
          <div className="space-y-3">
            <button className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors w-full text-left">
              <span className="text-xl mr-3">🔒</span>
              <div>
                <p className="font-medium text-gray-900">Change Password</p>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
            </button>
            
            <button className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors w-full text-left">
              <span className="text-xl mr-3">🔐</span>
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">Add an extra layer of security</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;