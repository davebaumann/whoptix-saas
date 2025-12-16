import { useQuery } from '@tanstack/react-query';
import { Trash2, AlertTriangle, Clock } from 'lucide-react';

interface PurgeEligibleCustomer {
  id: number;
  name: string;
  email: string;
  cancelledAt: string;
  daysInactive: number;
}

const fetchPurgeEligibleCustomers = async (): Promise<PurgeEligibleCustomer[]> => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/admin/purge-eligible', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch purge eligible customers');
  }

  return response.json();
};

export default function CustomerPurgeStatus() {
  const { data: eligibleCustomers, isLoading, error } = useQuery({
    queryKey: ['purgeEligibleCustomers'],
    queryFn: fetchPurgeEligibleCustomers,
    refetchInterval: 3600000, // Refresh every hour
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 ml-3">Data Purge Status</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Trash2 className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 ml-3">Data Purge Status</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">Failed to load purge status</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Trash2 className="w-6 h-6 text-red-500" />
            <h3 className="text-lg font-medium text-gray-900 ml-3">Data Purge Status</h3>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            Automated daily cleanup
          </div>
        </div>
      </div>

      <div className="p-6">
        {eligibleCustomers && eligibleCustomers.length > 0 ? (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-yellow-800 text-sm">
                  <strong>{eligibleCustomers.length}</strong> customers eligible for data purge (90+ days inactive)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cancelled Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Inactive
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eligibleCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(customer.cancelledAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.daysInactive} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Pending Purge
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">No customers currently eligible for data purge</p>
            <p className="text-gray-400 text-xs mt-1">
              Customers become eligible 90 days after cancellation
            </p>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">🔄 Automated Purge Process</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Runs daily at midnight to check for eligible customers</p>
            <p>• Customers must be inactive for 90+ days before purge</p>
            <p>• All customer data (inventory, transactions, etc.) is permanently deleted</p>
            <p>• Process includes transaction rollback for data integrity</p>
          </div>
        </div>
      </div>
    </div>
  );
}