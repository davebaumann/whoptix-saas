import { useQuery } from '@tanstack/react-query';
import { Database, HardDrive, Table, Clock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5239';

interface TableInfo {
  tableName: string;
  rowCount: number;
  dataSize: string;
  dataSizeBytes: number;
  indexSize: string;
  indexSizeBytes: number;
}

interface DatabaseSpecsData {
  databaseName: string;
  databaseSize: string;
  databaseSizeBytes: number;
  tableCount: number;
  tables: Record<string, TableInfo>;
  lastUpdated: string;
}

const fetchDatabaseSpecs = async (): Promise<DatabaseSpecsData> => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/admin/database-specs`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch database specs');
  }

  return response.json();
};

export default function DatabaseSpecs() {
  const { data: dbSpecs, isLoading, error, refetch } = useQuery({
    queryKey: ['databaseSpecs'],
    queryFn: fetchDatabaseSpecs,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Database className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-medium text-gray-900 ml-3">Database Specifications</h3>
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
          <Database className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 ml-3">Database Specifications</h3>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">Failed to load database specifications</p>
          <button 
            onClick={() => refetch()}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const topTables = Object.values(dbSpecs?.tables || {})
    .sort((a, b) => (b.dataSizeBytes + b.indexSizeBytes) - (a.dataSizeBytes + a.indexSizeBytes))
    .slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-medium text-gray-900 ml-3">Database Specifications</h3>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            Last updated: {dbSpecs ? new Date(dbSpecs.lastUpdated).toLocaleString() : 'N/A'}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Database Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-900">Database Name</p>
                <p className="text-lg font-bold text-blue-700">{dbSpecs?.databaseName}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <HardDrive className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Total Size</p>
                <p className="text-lg font-bold text-green-700">{dbSpecs?.databaseSize}</p>
                <p className="text-xs text-green-600">{formatBytes(dbSpecs?.databaseSizeBytes || 0)}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Table className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-purple-900">Table Count</p>
                <p className="text-lg font-bold text-purple-700">{dbSpecs?.tableCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Tables by Size */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Largest Tables</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Table Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rows
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Index Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Size
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topTables.map((table, index) => {
                  const totalSize = table.dataSizeBytes + table.indexSizeBytes;
                  return (
                    <tr key={table.tableName} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {table.tableName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {table.rowCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {table.dataSize}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {table.indexSize}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatBytes(totalSize)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hosting Cost Insights */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">💡 Hosting Cost Insights</h4>
          <div className="text-sm text-yellow-800 space-y-1">
            <p>• Current database size: <strong>{dbSpecs?.databaseSize}</strong></p>
            <p>• Monitor growth trends to predict hosting costs</p>
            <p>• Consider archiving old data from large tables to optimize costs</p>
            <p>• Tables with high index-to-data ratios may benefit from index optimization</p>
          </div>
        </div>
      </div>
    </div>
  );
}