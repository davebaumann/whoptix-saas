import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

interface InventoryItem {
  sku: string;
  productName: string;
  locationCode: string;
  locationName: string;
  warehouse: string;
  quantity: number;
  cost?: number;
  retailPrice?: number;
  totalCostValue: number;
  totalRetailValue: number;
  category?: string;
  isLowStock: boolean;
  thresholdQuantity?: number;
}

interface InventoryOverview {
  totalSkus: number;
  totalQuantity: number;
  totalCostValue: number;
  totalRetailValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  items: InventoryItem[];
}

export default function Inventory() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const customerId = user?.customerId || 1;

  const { data: inventoryData, isLoading, error } = useQuery<InventoryOverview>({
    queryKey: ['inventory', customerId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/reports/customer/${customerId}/inventory`, {
        credentials: 'include', // Use cookies for authentication like other working reports
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) throw new Error('Failed to fetch inventory data');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="text-red-600">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading inventory data</h3>
            <p className="text-sm text-red-700 mt-1">Please try again later.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!inventoryData) return null;

  // Filter items based on search and filters
  const filteredItems = inventoryData.items.filter(item => {
    const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.locationCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWarehouse = !selectedWarehouse || item.warehouse === selectedWarehouse;
    const matchesLowStock = !showLowStockOnly || item.isLowStock;
    
    return matchesSearch && matchesWarehouse && matchesLowStock;
  });

  const warehouses = [...new Set(inventoryData.items.map(item => item.warehouse))].filter(Boolean);
  
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Report</h1>
        <p className="mt-1 text-sm text-gray-600">
          Current inventory levels across all warehouses and locations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl text-blue-600 mr-3">📦</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total SKUs</p>
              <p className="text-2xl font-semibold text-gray-900">{inventoryData.totalSkus}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl text-green-600 mr-3">📊</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Quantity</p>
              <p className="text-2xl font-semibold text-gray-900">{inventoryData.totalQuantity.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl text-yellow-600 mr-3">⚠️</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-semibold text-red-600">{inventoryData.lowStockCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="text-2xl text-green-600 mr-3">💰</div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(inventoryData.totalRetailValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Products
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search by SKU, name, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="warehouse" className="block text-sm font-medium text-gray-700 mb-1">
              Warehouse
            </label>
            <select
              id="warehouse"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Warehouses</option>
              {warehouses.map(warehouse => (
                <option key={warehouse} value={warehouse}>{warehouse}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showLowStockOnly}
                onChange={(e) => setShowLowStockOnly(e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm font-medium text-gray-700">Show Low Stock Only</span>
            </label>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-600">
              Showing {filteredItems.length} of {inventoryData.items.length} items
            </p>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
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
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Cost
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Value
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  {searchTerm || selectedWarehouse || showLowStockOnly 
                    ? 'No items match your search criteria' 
                    : 'No inventory items found'}
                </td>
              </tr>
            ) : (
              filteredItems.map((item, index) => (
                <tr key={index} className={item.isLowStock ? 'bg-red-50' : 'hover:bg-gray-50'}>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.sku}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs" title={item.productName}>
                        {item.productName}
                      </div>
                      {item.category && (
                        <div className="text-xs text-gray-400">{item.category}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{item.locationCode}</div>
                    <div className="text-sm text-gray-500">{item.warehouse}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-medium ${item.isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {item.quantity.toLocaleString()}
                    </span>
                    {item.thresholdQuantity && (
                      <div className="text-xs text-gray-500">
                        Threshold: {item.thresholdQuantity}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    {item.cost ? formatCurrency(item.cost) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900">
                    {item.retailPrice ? formatCurrency(item.retailPrice) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                    {formatCurrency(item.totalRetailValue)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.isLowStock ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ⚠️ Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ In Stock
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Cost Summary</h3>
            <p className="text-2xl font-semibold text-blue-600">
              {formatCurrency(inventoryData.totalCostValue)}
            </p>
            <p className="text-sm text-gray-500">Total inventory cost</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Retail Value</h3>
            <p className="text-2xl font-semibold text-green-600">
              {formatCurrency(inventoryData.totalRetailValue)}
            </p>
            <p className="text-sm text-gray-500">Total retail value</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Potential Profit</h3>
            <p className="text-2xl font-semibold text-purple-600">
              {formatCurrency(inventoryData.totalRetailValue - inventoryData.totalCostValue)}
            </p>
            <p className="text-sm text-gray-500">Retail value - cost</p>
          </div>
        </div>
      </div>
    </div>
  );
}
