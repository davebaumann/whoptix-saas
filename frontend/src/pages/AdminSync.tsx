import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AdminSyncPage() {
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState('');
  const [syncType, setSyncType] = useState('sales');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const syncOptions = [
    { value: 'sales', label: 'Sales (with date range)' },
    { value: 'transactions', label: 'Transactions (with date range)' },
    { value: 'products', label: 'Products' },
    { value: 'locations', label: 'Locations' },
    { value: 'inventory', label: 'Inventory Levels' },
    { value: 'integrations', label: 'Integrations' },
    { value: 'shipments', label: 'Shipments' },
    { value: 'pos', label: 'Purchase Orders - Active (with date range)' },
    { value: 'pos-completed', label: 'Purchase Orders - Completed (with date range)' },
    { value: 'receives', label: 'Receives (with date range)' },
    { value: 'all', label: 'Full Customer Sync (All Data)' }
  ];

  const handleSync = async () => {
    if (!customerId.trim()) {
      setError('Please enter a Customer ID');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body: any = {
        customerId: parseInt(customerId),
        syncType: syncType
      };

      if ((syncType === 'sales' || syncType === 'transactions' || syncType === 'pos' || syncType === 'pos-completed' || syncType === 'receives') && fromDate) {
        body.fromDate = new Date(fromDate).toISOString();
      }

      if ((syncType === 'sales' || syncType === 'transactions' || syncType === 'pos' || syncType === 'pos-completed' || syncType === 'receives') && toDate) {
        body.toDate = new Date(toDate).toISOString();
      }

      const url = '/api/admin/sync/trigger';
      console.log('AdminSync: Calling endpoint:', url, 'with body:', body);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      console.log('AdminSync: Response status:', response.status);
      console.log('AdminSync: Response headers:', {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });

      const responseText = await response.text();
      console.log('AdminSync: Raw response body:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error('AdminSync: JSON parse error:', parseErr);
        setError(`Invalid JSON response: ${responseText.substring(0, 200)}`);
        return;
      }

      if (!response.ok) {
        console.error('AdminSync: Response not ok:', data);
        setError(data?.error || `Request failed with status ${response.status}`);
        return;
      }

      console.log('AdminSync: Success:', data);
      setResult(data);
    } catch (err: any) {
      console.error('AdminSync: Fetch error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Admin Sync Control</h1>

      {!user?.roles?.includes('Admin') && (
        <div className="bg-red-100 text-red-800 p-4 rounded mb-4">
          Access denied. Admin role required.
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="space-y-4">
          {/* Customer ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer ID *
            </label>
            <input
              type="number"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="Enter customer ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sync Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sync Type *
            </label>
            <select
              value={syncType}
              onChange={(e) => setSyncType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {syncOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* From Date (only for sales, transactions, purchase orders, and receives) */}
          {(syncType === 'sales' || syncType === 'transactions' || syncType === 'pos' || syncType === 'pos-completed' || syncType === 'receives') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date (optional - defaults to 30/365 days ago)
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date (optional - defaults to today)
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Sync Button */}
          <button
            onClick={handleSync}
            disabled={loading || !customerId.trim()}
            className={`w-full py-2 px-4 rounded-md font-medium text-white transition ${
              loading || !customerId.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Syncing...' : 'Start Sync'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-6 bg-red-100 text-red-800 p-4 rounded">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Success Result */}
      {result && (
        <div className="mt-6 bg-green-100 text-green-800 p-4 rounded">
          <p className="font-semibold text-lg mb-2">✓ {result.message}</p>
          <div className="space-y-1 text-sm">
            {result.syncType && <p>Sync Type: {result.syncType}</p>}
            {result.customerId && <p>Customer ID: {result.customerId}</p>}
            {result.fromDate && <p>From Date: {new Date(result.fromDate).toLocaleDateString()}</p>}
            {result.toDate && <p>To Date: {new Date(result.toDate).toLocaleDateString()}</p>}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-6 bg-blue-50 p-4 rounded border border-blue-200">
        <h3 className="font-semibold text-sm mb-2">Notes:</h3>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• Sales and Transactions support date range filtering</li>
          <li>• Other sync types ignore the date field and sync all available data</li>
          <li>• "Full Customer Sync" runs all sync operations sequentially</li>
          <li>• This uses existing sync logic with pagination support</li>
        </ul>
      </div>
    </div>
  );
}
