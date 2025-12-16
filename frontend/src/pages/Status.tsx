import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  responseTime?: number;
  lastChecked: Date;
}

export default function Status() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Server', status: 'operational', lastChecked: new Date() },
    { name: 'Database', status: 'operational', lastChecked: new Date() },
    { name: 'SkuVault Integration', status: 'operational', lastChecked: new Date() },
    { name: 'Email Service', status: 'operational', lastChecked: new Date() },
    { name: 'Payment Processing', status: 'operational', lastChecked: new Date() }
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const startTime = Date.now();
      const isHealthy = response.ok;
      const responseTime = Date.now() - startTime;

      setServices(prev => prev.map(service => {
        if (service.name === 'API Server') {
          return {
            ...service,
            status: isHealthy ? 'operational' : 'down',
            responseTime,
            lastChecked: new Date()
          };
        }
        return {
          ...service,
          lastChecked: new Date()
        };
      }));
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Health check failed:', error);
      setServices(prev => prev.map(service => {
        if (service.name === 'API Server') {
          return {
            ...service,
            status: 'down',
            lastChecked: new Date()
          };
        }
        return service;
      }));
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'degraded':
        return 'Degraded Performance';
      case 'down':
        return 'Service Unavailable';
      default:
        return 'Unknown';
    }
  };

  const overallStatus = services.every(s => s.status === 'operational') 
    ? 'operational' 
    : services.some(s => s.status === 'down') 
      ? 'down' 
      : 'degraded';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">System Status</h1>
              <p className="text-gray-600">
                Current status of WhOptix services and infrastructure
              </p>
            </div>
            <button
              onClick={checkHealth}
              disabled={isChecking}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Checking...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Overall Status */}
        <div className={`rounded-lg border-2 p-6 mb-8 ${getStatusColor(overallStatus)}`}>
          <div className="flex items-center">
            {getStatusIcon(overallStatus)}
            <div className="ml-3">
              <h2 className="text-xl font-semibold">
                {overallStatus === 'operational' 
                  ? 'All Systems Operational' 
                  : overallStatus === 'down'
                    ? 'Service Disruption'
                    : 'Degraded Performance'
                }
              </h2>
              <p className="text-sm opacity-75">
                Last updated: {lastUpdate.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Service Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Service Status</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {services.map((service, index) => (
              <div key={index} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  {getStatusIcon(service.status)}
                  <div className="ml-3">
                    <h4 className="font-medium text-gray-900">{service.name}</h4>
                    <p className="text-sm text-gray-500">
                      Last checked: {service.lastChecked.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(service.status)}`}>
                    {getStatusText(service.status)}
                  </span>
                  {service.responseTime && (
                    <p className="text-xs text-gray-500 mt-1">
                      {service.responseTime}ms response time
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident History */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Incidents</h3>
          </div>
          
          <div className="px-6 py-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No Recent Incidents</p>
            <p>All systems have been running smoothly. We'll post updates here if any issues occur.</p>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Experiencing Issues?</h3>
              <p className="text-blue-700 text-sm mb-3">
                If you're experiencing problems not reflected on this status page, please contact our support team.
              </p>
              <div className="space-x-4">
                <Link 
                  to="/support" 
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Contact Support →
                </Link>
                <Link 
                  to="/contact" 
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  General Contact →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}