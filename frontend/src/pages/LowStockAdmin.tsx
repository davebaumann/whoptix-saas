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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<LowStockThreshold | null>(null);

  // Form state for adding/editing thresholds
  const [formData, setFormData] = useState({
    productId: 0,
    locationId: undefined as number | undefined,
    thresholdQuantity: 10
  });

  // Get customer ID from user context (assuming it's available)
  const customerId = user?.customerId || 1;

  // Queries
  const { data: thresholds = [], isLoading: loadingThresholds } = useQuery({
    queryKey: ['lowStockThresholds', customerId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/lowstock/thresholds/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch thresholds');
      return response.json();
    }
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', customerId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/lowstock/products/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    }
  });

  const { data: locations = [], isLoading: loadingLocations } = useQuery({
    queryKey: ['locations', customerId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/lowstock/locations/${customerId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch locations');
      return response.json();
    }
  });

  // Mutations
  const createThresholdMutation = useMutation({
    mutationFn: async (data: CreateThresholdData) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/lowstock/thresholds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to create threshold');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lowStockThresholds', customerId] });
      setIsAddModalOpen(false);
      resetForm();
    }
  });

  const updateThresholdMutation = useMutation({
    mutationFn: async ({ id, thresholdQuantity }: { id: number; thresholdQuantity: number }) => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/lowstock/thresholds/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
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
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to delete threshold');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lowStockThresholds', customerId] });
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
                  onChange={(e) => setFormData({ ...formData, thresholdQuantity: parseInt(e.target.value) })}
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
    </div>
  );
};

export default LowStockAdmin;