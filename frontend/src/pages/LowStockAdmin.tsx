import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

interface LowStockThreshold {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  locationId?: number;
  locationName: string;
  thresholdQuantity: number;
  isActive: boolean;
  updatedAtUtc: string;
  updatedBy?: string;
}

interface Product {
  id: number;
  sku: string;
  name: string;
  category?: string;
}

interface Location {
  id: number;
  name: string;
  code: string;
}

interface CreateThresholdData {
  customerId: number;
  productId: number;
  locationId?: number;
  thresholdQuantity: number;
}

const LowStockAdmin: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  console.log('🔍 LowStockAdmin component is rendering!', { user, authLoading });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<LowStockThreshold | null>(null);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);

  // Form state for adding/editing thresholds
  const [formData, setFormData] = useState({
    productId: 0,
    locationId: undefined as number | undefined,
    thresholdQuantity: 10
  });

  // Notification preferences state
  const [notificationPrefs, setNotificationPrefs] = useState({
    lowStockNotificationsEnabled: false,
    lowStockNotificationEmail: '',
    lowStockCheckIntervalMinutes: 240,
    canEnableNotifications: false,
    membershipLevel: 'Basic'
  });

  // Get customer ID from user context (assuming it's available)
  // Check if admin is viewing as another customer
  const adminViewingData = sessionStorage.getItem('adminViewingAs');
  const adminViewingCustomerId = adminViewingData ? JSON.parse(adminViewingData).customerId : null;
  
  // Use impersonated customer ID if admin is viewing as, otherwise use user's own customer ID
  const customerId = adminViewingCustomerId || user?.customerId || 1;
  console.log('🔍 LowStockAdmin customerId:', customerId);

  // Early loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Check authentication and customer ID
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Authentication required.</p>
        </div>
      </div>
    )
  }

  // Queries
  const { data: thresholds = [], isLoading: loadingThresholds, error: thresholdsError } = useQuery({
    queryKey: ['lowStockThresholds', customerId],
    retry: false,
    queryFn: async () => {
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/lowstock/thresholds/${customerId}`;
      console.log('🔍 Fetching thresholds from:', url);
      const response = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch thresholds');
      const data = await response.json();
      console.log('🔍 Thresholds fetched:', data);
      return data;
    }
  });
  
  console.log('🔍 Thresholds state:', { thresholds, loadingThresholds, thresholdsError });

  const { data: products = [], isLoading: loadingProducts, error: productsError } = useQuery({
    queryKey: ['products', customerId],
    retry: false,
    queryFn: async () => {
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/lowstock/products/${customerId}`;
      console.log('🔍 Fetching products from:', url);
      const response = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      console.log('🔍 Products fetched:', data);
      return data;
    }
  });

  const { data: locations = [], isLoading: loadingLocations, error: locationsError } = useQuery({
    queryKey: ['locations', customerId],
    retry: false,
    queryFn: async () => {
      const url = `${import.meta.env.VITE_API_BASE_URL}/api/lowstock/locations/${customerId}`;
      console.log('🔍 Fetching locations from:', url);
      const response = await fetch(url, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      console.log('🔍 Locations fetched:', data);
      return data;
    }
  });
  
  console.log('🔍 Query states:', { 
    loadingThresholds, 
    loadingProducts, 
    loadingLocations,
    thresholdsError,
    productsError,
    locationsError
  });

  // Mutations
  const createThresholdMutation = useMutation({
    mutationFn: async (data: CreateThresholdData) => {
      console.log('🔍 Creating threshold with data:', data);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/lowstock/thresholds`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.text();
        console.error('🔴 Create threshold error:', error);
        throw new Error(error || 'Failed to create threshold');
      }
      return response.json();
    },
    onSuccess: () => {
      console.log('✅ Threshold created successfully');
      queryClient.invalidateQueries({ queryKey: ['lowStockThresholds', customerId] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      console.error('🔴 Mutation error:', error);
    }
  });

  const updateThresholdMutation = useMutation({
    mutationFn: async ({ id, thresholdQuantity }: { id: number; thresholdQuantity: number }) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/lowstock/thresholds/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ thresholdQuantity })
      });
      if (!response.ok) throw new Error('Failed to update threshold');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lowStockThresholds', customerId] });
      setEditingThreshold(null);
      setIsAddModalOpen(false); // Close the modal after successful edit
    }
  });

  const deleteThresholdMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/lowstock/thresholds/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to delete threshold');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lowStockThresholds', customerId] });
    }
  });

  // Notification preferences query
  const { data: notificationData } = useQuery({
    queryKey: ['notificationPreferences', customerId],
    retry: false,
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/customernotification/${customerId}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to fetch notification preferences');
      return response.json();
    }
  });

  // Update local state when data is loaded
  React.useEffect(() => {
    if (notificationData) {
      setNotificationPrefs(notificationData);
    }
  }, [notificationData]);

  const updateNotificationMutation = useMutation({
    mutationFn: async (data: typeof notificationPrefs) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/customernotification/${customerId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update notification preferences');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences', customerId] });
      setShowNotificationSettings(false);
    }
  });

  const resetForm = () => {
    setFormData({
      productId: 0,
      locationId: undefined,
      thresholdQuantity: 10
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingThreshold) {
      updateThresholdMutation.mutate({
        id: editingThreshold.id,
        thresholdQuantity: formData.thresholdQuantity
      });
    } else {
      createThresholdMutation.mutate({
        customerId,
        ...formData
      });
    }
  };

  const startEdit = (threshold: LowStockThreshold) => {
    setEditingThreshold(threshold);
    setFormData({
      productId: threshold.productId,
      locationId: threshold.locationId,
      thresholdQuantity: threshold.thresholdQuantity
    });
    setIsAddModalOpen(true);
  };

  // Filter thresholds based on search and category
  const filteredThresholds = thresholds.filter((threshold: LowStockThreshold) => {
    const matchesSearch = threshold.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         threshold.productSku.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!selectedCategory) return matchesSearch;
    
    const product = products.find((p: Product) => p.id === threshold.productId);
    return matchesSearch && product?.category === selectedCategory;
  });

  // Get unique categories for filter
  const categories = [...new Set(products.map((p: Product) => p.category).filter(Boolean))];

  if (loadingThresholds || loadingProducts || loadingLocations) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error if any query failed
  if (thresholdsError || productsError || locationsError) {
    console.error('🔴 Query Errors:', { thresholdsError, productsError, locationsError });
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <p className="text-red-700 font-semibold mb-2">Error loading data</p>
          {thresholdsError && (
            <p className="text-red-600 text-sm mb-2">
              Thresholds: {(thresholdsError as Error).message}
            </p>
          )}
          {productsError && (
            <p className="text-red-600 text-sm mb-2">
              Products: {(productsError as Error).message}
            </p>
          )}
          {locationsError && (
            <p className="text-red-600 text-sm mb-2">
              Locations: {(locationsError as Error).message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Low Stock Thresholds</h1>
          <p className="text-gray-600 mt-1">
            Set custom low stock thresholds for your products and locations
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNotificationSettings(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <span>📧</span>
            Email Settings
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingThreshold(null);
              setIsAddModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <span className="text-lg">+</span>
            Add Threshold
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">📋</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category as string} value={category as string}>
                {category as string}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Thresholds Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Threshold Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Updated
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredThresholds.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm || selectedCategory ? 'No thresholds match your criteria' : 'No thresholds configured'}
                </td>
              </tr>
            ) : (
              filteredThresholds.map((threshold: LowStockThreshold) => (
                <tr key={threshold.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {threshold.productName}
                      </div>
                      <div className="text-sm text-gray-500">{threshold.productSku}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{threshold.locationName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <span className="mr-1">⚠️</span>
                      {threshold.thresholdQuantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{new Date(threshold.updatedAtUtc).toLocaleDateString()}</div>
                    <div className="text-xs">by {threshold.updatedBy || 'System'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => startEdit(threshold)}
                      className="text-blue-600 hover:text-blue-900 mr-3 px-2 py-1 rounded"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteThresholdMutation.mutate(threshold.id)}
                      className="text-red-600 hover:text-red-900 px-2 py-1 rounded"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {editingThreshold ? 'Edit Threshold' : 'Add New Threshold'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: parseInt(e.target.value) })}
                  required
                  disabled={!!editingThreshold}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={0}>Select a product</option>
                  {products.map((product: Product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} - {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (optional)
                </label>
                <select
                  value={formData.locationId || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    locationId: e.target.value ? parseInt(e.target.value) : undefined 
                  })}
                  disabled={!!editingThreshold}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Locations</option>
                  {locations.map((location: Location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Threshold Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.thresholdQuantity}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ 
                      ...formData, 
                      thresholdQuantity: val === '' ? 0 : parseInt(val, 10) 
                    });
                  }}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingThreshold(null);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createThresholdMutation.isPending || updateThresholdMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {(createThresholdMutation.isPending || updateThresholdMutation.isPending) 
                    ? 'Saving...' 
                    : editingThreshold ? 'Update' : 'Create'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notification Settings Modal */}
      {showNotificationSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span>📧</span>
              Email Notification Settings
            </h2>
            <div className="space-y-4">
              {!notificationPrefs.canEnableNotifications && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 mb-2">Premium Feature</h3>
                  <p className="text-sm text-yellow-800 mb-3">
                    Email notifications for low stock items require a Premium membership tier.
                  </p>
                  <p className="text-xs text-yellow-700">
                    <strong>Current plan:</strong> {notificationPrefs.membershipLevel}
                  </p>
                  <button
                    onClick={() => window.location.href = 'https://justsku.com/app/membership/upgrade'}
                    className="mt-3 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                  >
                    Upgrade Your Plan
                  </button>
                </div>
              )}
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableNotifications"
                  checked={notificationPrefs.lowStockNotificationsEnabled}
                  onChange={(e) => setNotificationPrefs({
                    ...notificationPrefs,
                    lowStockNotificationsEnabled: e.target.checked
                  })}
                  disabled={!notificationPrefs.canEnableNotifications}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <label htmlFor="enableNotifications" className={`ml-2 block text-sm ${notificationPrefs.canEnableNotifications ? 'text-gray-900' : 'text-gray-500'}`}>
                  Enable low stock email notifications
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Email Address
                </label>
                <input
                  type="email"
                  value={notificationPrefs.lowStockNotificationEmail}
                  onChange={(e) => setNotificationPrefs({
                    ...notificationPrefs,
                    lowStockNotificationEmail: e.target.value
                  })}
                  disabled={!notificationPrefs.canEnableNotifications}
                  placeholder="Enter email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check Interval (minutes)
                </label>
                <select
                  value={notificationPrefs.lowStockCheckIntervalMinutes}
                  onChange={(e) => setNotificationPrefs({
                    ...notificationPrefs,
                    lowStockCheckIntervalMinutes: parseInt(e.target.value)
                  })}
                  disabled={!notificationPrefs.canEnableNotifications}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value={60}>Every hour</option>
                  <option value={120}>Every 2 hours</option>
                  <option value={240}>Every 4 hours</option>
                  <option value={480}>Every 8 hours</option>
                  <option value={720}>Every 12 hours</option>
                  <option value={1440}>Daily</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNotificationSettings(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateNotificationMutation.mutate(notificationPrefs)}
                  disabled={updateNotificationMutation.isPending || (!notificationPrefs.canEnableNotifications && notificationPrefs.lowStockNotificationsEnabled)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateNotificationMutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              {updateNotificationMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {(updateNotificationMutation.error as Error)?.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LowStockAdmin;