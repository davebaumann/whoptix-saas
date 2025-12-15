import React from 'react';
import { Eye, X } from 'lucide-react';

const AdminViewingBanner: React.FC = () => {
  const adminViewingData = sessionStorage.getItem('adminViewingAs');
  
  if (!adminViewingData) return null;
  
  const { customerName } = JSON.parse(adminViewingData);
  
  const exitAdminView = () => {
    sessionStorage.removeItem('adminViewingAs');
    window.location.href = '/app/admin/customers';
  };
  
  return (
    <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between shadow-md">
      <div className="flex items-center space-x-2">
        <Eye className="w-4 h-4" />
        <span className="text-sm font-medium">
          Admin View: You are viewing as <strong>{customerName}</strong>
        </span>
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