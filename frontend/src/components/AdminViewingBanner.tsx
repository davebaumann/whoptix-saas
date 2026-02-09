import React, { useState, useEffect } from 'react';
import { Eye, X, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMembership } from '../contexts/MembershipContext';

interface ReportOption {
  id: string;
  name: string;
  path: string;
}

const AdminViewingBanner: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { membershipInfo, refreshMembership } = useMembership();
  
  const adminViewingData = sessionStorage.getItem('adminViewingAs');
  
  if (!adminViewingData) return null;
  
  const { customerName, customerId } = JSON.parse(adminViewingData);
  
  // Refresh membership when admin view changes to ensure we have the impersonated customer's data
  useEffect(() => {
    if (customerId) {
      console.log('[AdminViewingBanner] Admin viewing as customer:', customerId);
      refreshMembership();
    }
  }, [customerId]);

  // Define all available reports
  const allReports: ReportOption[] = [
    { id: 'dashboard', name: 'Dashboard (Picker Analytics)', path: '/app/dashboard' },
    { id: 'inventory', name: 'Inventory', path: '/app/inventory' },
    { id: 'low-stock', name: 'Low Stock Alerts', path: '/app/low-stock' },
    { id: 'aging-inventory', name: 'Aging Inventory', path: '/app/aging-inventory' },
    { id: 'locations', name: 'Location Performance', path: '/app/locations' },
    { id: 'profitability', name: 'Profitability', path: '/app/profitability' },
    { id: 'demand-forecast', name: 'Demand Forecast', path: '/app/demand-forecast' },
    { id: 'financial-warehouse', name: 'Financial Warehouse', path: '/app/financial-warehouse' },
    { id: 'performance', name: 'Performance Analytics', path: '/app/performance' },
    { id: 'picker-analytics', name: 'Picker Analytics', path: '/app/picker-analytics' },
    { id: 'channel-performance', name: 'Channel Performance', path: '/app/channel-performance' },
    { id: 'inventory-turnover', name: 'Inventory Turnover', path: '/app/inventory-turnover' },
  ];

  // Filter reports based on membership access
  const availableReports = allReports.filter(report => {
    // Always show dashboard and inventory
    if (report.id === 'dashboard' || report.id === 'inventory') return true;
    // Check membership access for other reports
    const hasAccess = membershipInfo && membershipInfo.availableReports.includes(report.id);
    if (!hasAccess) {
      console.log(`[AdminViewingBanner] Filtering out report: ${report.id}, availableReports:`, membershipInfo?.availableReports);
    }
    return hasAccess;
  });
  
  console.log('[AdminViewingBanner] Membership info:', { 
    customerName, 
    currentLevel: membershipInfo?.currentLevel,
    availableReports: membershipInfo?.availableReports,
    filteredReportCount: availableReports.length
  });

  const handleNavigateToReport = (path: string) => {
    setIsDropdownOpen(false);
    navigate(path);
  };
  
  const exitAdminView = () => {
    sessionStorage.removeItem('adminViewingAs');
    // Dispatch event for MembershipProvider to listen to
    window.dispatchEvent(new Event('adminViewingAsChanged'));
    window.location.href = '/app/admin/customers';
  };
  
  return (
    <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4" />
          <span className="text-sm font-medium">
            Admin View: You are viewing as <strong>{customerName}</strong>
          </span>
        </div>
        
        {/* Reports Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-1 px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs font-medium transition-colors"
          >
            <span>Reports ({availableReports.length})</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white text-gray-900 rounded shadow-lg z-50 max-h-96 overflow-y-auto">
              {availableReports.length > 0 ? (
                availableReports.map(report => (
                  <button
                    key={report.id}
                    onClick={() => handleNavigateToReport(report.path)}
                    className="w-full text-left px-4 py-2 hover:bg-orange-50 text-sm transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    {report.name}
                  </button>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">No reports available</div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <button
        onClick={exitAdminView}
        className="flex items-center space-x-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs"
      >
        <X className="w-3 h-3" />
        <span>Exit Admin View</span>
      </button>
    </div>
  );
};

export default AdminViewingBanner;