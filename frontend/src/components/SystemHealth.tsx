import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Database, Server, Clock, MemoryStick } from 'lucide-react';

interface SystemHealthData {
  timestamp: string;
  status: string;
  database: {
    status: string;
    responseTimeMs: number;
    customerCount: number;
    productCount: number;
  };
  api: {
    status: string;
    environment: string;
    version: string;
  };
  memory: {
    workingSetMB: number;
    privateMemoryMB: number;
  };
  uptime: {
    totalMinutes: number;
    startTime: string;
  };
}

const SystemHealth: React.FC = () => {
  const { data: healthData, isLoading, error } = useQuery<SystemHealthData>({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/systemhealth`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch system health');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'connected':
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
      case 'disconnected':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-red-200">
        <div className="flex items-center mb-4">
          <Activity className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 ml-3">System Health</h3>
        </div>
        <div className="text-red-600">Failed to load system health data</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Activity className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-medium text-gray-900 ml-3">System Health</h3>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(healthData?.status || 'unknown')}`}>
            {healthData?.status?.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Database Health */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Database className="w-5 h-5 text-blue-500" />
              <h4 className="text-sm font-medium text-gray-900 ml-2">Database</h4>
            </div>
            <div className="space-y-1">
              <div className={`text-xs px-2 py-1 rounded ${getStatusColor(healthData?.database.status || 'unknown')}`}>
                {healthData?.database.status}
              </div>
              <div className="text-xs text-gray-600">
                Response: {healthData?.database.responseTimeMs}ms
              </div>
              <div className="text-xs text-gray-600">
                {healthData?.database.customerCount} customers
              </div>
            </div>
          </div>

          {/* API Health */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Server className="w-5 h-5 text-green-500" />
              <h4 className="text-sm font-medium text-gray-900 ml-2">API</h4>
            </div>
            <div className="space-y-1">
              <div className={`text-xs px-2 py-1 rounded ${getStatusColor(healthData?.api.status || 'unknown')}`}>
                {healthData?.api.status}
              </div>
              <div className="text-xs text-gray-600">
                {healthData?.api.environment}
              </div>
              <div className="text-xs text-gray-600">
                v{healthData?.api.version}
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <MemoryStick className="w-5 h-5 text-purple-500" />
              <h4 className="text-sm font-medium text-gray-900 ml-2">Memory</h4>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-600">
                Working: {healthData?.memory.workingSetMB}MB
              </div>
              <div className="text-xs text-gray-600">
                Private: {healthData?.memory.privateMemoryMB}MB
              </div>
            </div>
          </div>

          {/* Uptime */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <h4 className="text-sm font-medium text-gray-900 ml-2">Uptime</h4>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-600">
                {Math.floor((healthData?.uptime.totalMinutes || 0) / 60)}h {Math.floor((healthData?.uptime.totalMinutes || 0) % 60)}m
              </div>
              <div className="text-xs text-gray-600">
                Started: {healthData?.uptime.startTime}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Last updated: {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleString() : 'Unknown'}
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;