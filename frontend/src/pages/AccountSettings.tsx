import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useMembership } from '../contexts/MembershipContext';
import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import ReceiptsModal from '../components/ReceiptsModal';

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
  const [testing, setTesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [testPassed, setTestPassed] = useState(false);
  const [error, setError] = useState('');

  const handleTest = async () => {
    setTesting(true);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/test-skuvault`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.username,
          password: credentials.password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Test failed. Please check your credentials.');
        setTestPassed(false);
      } else {
        setTestPassed(true);
        setError('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed');
      setTestPassed(false);
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshTokens = async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/refresh-skuvault-tokens`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to refresh tokens');
      } else {
        setShowModal(false);
        setTestPassed(false);
        setCredentials({ username: '', password: '' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh tokens');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/customers/update-skuvault-credentials`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.username,
          password: credentials.password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save credentials');
      } else {
        setShowModal(false);
        setTestPassed(false);
        setCredentials({ username: '', password: '' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={credentials.username}
                  onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                  placeholder="your@skuvault.com"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={testPassed}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={testPassed}
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                  {error}
                </div>
              )}
              {testPassed && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                  ✓ Credentials verified successfully!
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setTestPassed(false);
                  setCredentials({ username: '', password: '' });
                  setError('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              {!testPassed ? (
                <button
                  onClick={handleTest}
                  disabled={testing || !credentials.username || !credentials.password}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Test'}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleRefreshTokens}
                    disabled={refreshing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh Tokens'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      console.log('Changing password...');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.errors?.[0] || data.message || 'Failed to change password');
      }

      return response.json();
    },
    onSuccess: () => {
      setSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 1500);
    },
    onError: (error: Error) => {
      setError(error.message);
      setSuccess('');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    changePasswordMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Change Password</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TwoFactorModal: React.FC<{ isOpen: boolean; onClose: () => void; userEmail?: string }> = ({ isOpen, onClose, userEmail }) => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [copied, setCopied] = useState(false);

  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        const error = await response.text();
        console.error('2FA setup failed:', response.status, error);
        throw new Error('Failed to setup 2FA');
      }
      const data = await response.json();
      console.log('2FA setup response:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('2FA setup success, setting state:', { secret: data.secret });
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep('verify');
    },
    onError: (error) => {
      console.error('2FA setup mutation error:', error);
      setError('Failed to setup 2FA');
    }
  });

  const verify2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Invalid verification code');
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccess('Two-factor authentication enabled successfully!');
      setTimeout(() => {
        onClose();
        setStep('setup');
        setVerificationCode('');
        setError('');
        setSuccess('');
        setSecret('');
        setBackupCodes([]);
        setShowBackupCodes(false);
      }, 2000);
    },
    onError: (error: Error) => {
      setError(error.message);
    }
  });

  const copyBackupCodes = () => {
    const text = backupCodes.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/2fa/disable`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) {
        throw new Error('Failed to disable 2FA');
      }
      return response.json();
    },
    onSuccess: () => {
      setSuccess('Two-factor authentication has been disabled.');
      setTimeout(() => {
        onClose();
        setStep('setup');
        setVerificationCode('');
        setError('');
        setSuccess('');
        setSecret('');
        setBackupCodes([]);
        setShowBackupCodes(false);
      }, 2000);
    },
    onError: () => {
      setError('Failed to disable 2FA');
    }
  });

  const handleSetup = () => {
    setError('');
    setup2FAMutation.mutate();
  };

  const handleVerify = () => {
    setError('');
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    verify2FAMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {step === 'setup' ? 'Enable Two-Factor Authentication' : 'Verify Your Setup'}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        {step === 'setup' ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm text-blue-900">
                Click "Next" to generate your two-factor authentication setup. You'll be able to scan a QR code or enter a key manually into your authenticator app.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSetup}
                disabled={setup2FAMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {setup2FAMutation.isPending ? 'Setting up...' : 'Next'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Display QR Code and Manual Key in verify step */}
            {secret && (
              <>
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">Authenticator App Setup:</p>
                  <div className="flex justify-center mb-3">
                    <QRCodeSVG 
                      value={`otpauth://totp/JUSTSKU%20(${encodeURIComponent(userEmail || '')})?secret=${secret}&issuer=JUSTSKU&algorithm=SHA1&digits=6&period=30`}
                      size={160}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">Manual Entry Key (if QR code doesn't work):</p>
                    <p className="font-mono text-sm text-gray-900 break-all">{secret}</p>
                  </div>
                </div>
              </>
            )}
            
            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app to verify the setup.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Verification Code
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                placeholder="000000"
                className="w-full px-3 py-2 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {!showBackupCodes ? (
              <button
                type="button"
                onClick={() => setShowBackupCodes(true)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View backup codes
              </button>
            ) : (
              <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                <p className="text-sm font-medium text-yellow-900 mb-2">⚠️ Save your backup codes</p>
                <p className="text-xs text-yellow-800 mb-3">
                  Save these codes in a safe place. You can use them to access your account if you lose access to your authenticator app.
                </p>
                <div className="bg-white p-3 rounded font-mono text-xs text-gray-700 mb-3 max-h-40 overflow-y-auto">
                  {backupCodes.map((code, idx) => (
                    <div key={idx}>{code}</div>
                  ))}
                </div>
                <button
                  onClick={copyBackupCodes}
                  className="w-full text-sm px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
                >
                  {copied ? '✓ Copied' : 'Copy codes'}
                </button>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setStep('setup');
                  setVerificationCode('');
                  setShowBackupCodes(false);
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={verify2FAMutation.isPending || verificationCode.length !== 6}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {verify2FAMutation.isPending ? 'Verifying...' : 'Enable 2FA'}
              </button>
            </div>

            {/* Disable 2FA button - shown when 2FA is enabled */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to disable two-factor authentication?')) {
                    disable2FAMutation.mutate();
                  }
                }}
                disabled={disable2FAMutation.isPending}
                className="w-full px-4 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
              >
                {disable2FAMutation.isPending ? 'Disabling...' : 'Disable Two-Factor Authentication'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AccountSettings: React.FC = () => {
  const { user } = useAuth();
  const { membershipInfo } = useMembership();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ isEnabled: boolean; backupCodesRemaining: number } | null>(null);

  const customerId = user?.customerId || 1;

  // Fetch 2FA status
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

  // Fetch 2FA status
  useQuery({
    queryKey: ['2faStatus'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/2fa/status`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch 2FA status');
      const data = await response.json();
      setTwoFactorStatus(data);
      return data;
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
                <p className="font-medium text-gray-900">
                  {membershipInfo?.renewalDate 
                    ? new Date(membershipInfo.renewalDate).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : 'Loading...'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Monthly Cost</p>
                <p className="font-medium text-gray-900">
                  {membershipInfo?.monthlyCost ? `$${membershipInfo.monthlyCost}.00` : 'Loading...'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowReceiptsModal(true)}
              className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
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
            <button 
              onClick={() => setShowChangePasswordModal(true)}
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors w-full text-left"
            >
              <span className="text-xl mr-3">🔒</span>
              <div>
                <p className="font-medium text-gray-900">Change Password</p>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
            </button>
            
            <button 
              onClick={() => setShow2FAModal(true)}
              className="flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors w-full text-left"
            >
              <span className="text-xl mr-3">🔐</span>
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-500">
                  {twoFactorStatus?.isEnabled 
                    ? `Enabled • ${twoFactorStatus.backupCodesRemaining} backup codes remaining`
                    : 'Add an extra layer of security'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={showChangePasswordModal} 
        onClose={() => setShowChangePasswordModal(false)} 
      />
      
      <TwoFactorModal 
        isOpen={show2FAModal} 
        onClose={() => setShow2FAModal(false)} 
        userEmail={user?.email}
      />

      <ReceiptsModal
        isOpen={showReceiptsModal}
        onClose={() => setShowReceiptsModal(false)}
      />
    </div>
  );
};

export default AccountSettings;