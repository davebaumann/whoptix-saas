import React, { useState, useMemo } from 'react';

function DemoAgingInventoryReport({ agingInventoryData }: { agingInventoryData: any }) {
  // Sorting and pagination state
  const [sortField, _setSortField] = useState('sku');
  const [sortDirection, _setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  // Group by SKU for main rows, with subrows for each location
  const groupedData = useMemo(() => {
    if (!agingInventoryData?.items) return [];
    // Sort first
    const sorted = [...agingInventoryData.items].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      const numA = Number(aValue);
      const numB = Number(bValue);
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
    // Group by SKU
    const grouped: Record<string, any[]> = {};
    for (const item of sorted) {
      if (!grouped[item.sku]) grouped[item.sku] = [];
      grouped[item.sku].push(item);
    }
    return Object.entries(grouped);
  }, [agingInventoryData, sortField, sortDirection]);

  const paginatedGroups = groupedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalPages = Math.ceil((agingInventoryData?.items?.length || 0) / pageSize);

  // Age bracket summary - calculated but not currently displayed
  // TODO: Use these for age bracket summary section in future
  // const totalQuantity = agingInventoryData.items?.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0;
  // const days0_30 = agingInventoryData.items?.filter((i: any) => i.daysInInventory <= 30).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0;
  // const days31_60 = agingInventoryData.items?.filter((i: any) => i.daysInInventory > 30 && i.daysInInventory <= 60).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0;
  // const days61_90 = agingInventoryData.items?.filter((i: any) => i.daysInInventory > 60 && i.daysInInventory <= 90).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0;
  // const days90Plus = agingInventoryData.items?.filter((i: any) => i.daysInInventory > 90).reduce((sum: number, i: any) => sum + (i.quantity || 0), 0) || 0;

  // Badge color for age group
  const ageGroupBadge = (ageGroup: string) => {
    switch (ageGroup) {
      case '0-30 days': return 'bg-green-100 text-green-800';
      case '30-60 days': return 'bg-blue-100 text-blue-800';
      case '60-90 days': return 'bg-yellow-100 text-yellow-800';
      case '90-180 days': return 'bg-orange-100 text-orange-800';
      case 'Over 180 days': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days in Inventory</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sale Date</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Age Group</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedGroups.map(([sku, items]) => (
                <React.Fragment key={sku}>
                  {/* Main row for SKU */}
                  <tr className="bg-blue-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-900 uppercase" colSpan={8}>
                      {sku}
                    </td>
                  </tr>
                  {/* Subrows for each location */}
                  {items.map((item, idx) => (
                    <tr key={sku + '-' + item.location + '-' + idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-8"></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.productName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                        {item.daysInInventory}d
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-700">${item.costValue?.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.lastSaleDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${ageGroupBadge(item.ageGroup)}`}>
                          {item.ageGroup === 'Over 180 days' ? 'OBSOLETE' : item.ageGroup.replace(' days', '').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * pageSize, agingInventoryData.items.length)}</span> of{' '}
                  <span className="font-medium">{agingInventoryData.items.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DemoAgingInventoryReport;
