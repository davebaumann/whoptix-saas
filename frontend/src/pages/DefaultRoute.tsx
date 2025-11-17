import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from '../pages/Dashboard';

const DefaultRoute: React.FC = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasRole('Admin')) {
      navigate('/admin', { replace: true });
    }
  }, [hasRole, navigate]);

  // For non-admin users, show the regular dashboard
  if (!hasRole('Admin')) {
    return <Dashboard />;
  }

  // For admin users, return null while redirecting
  return null;
};

export default DefaultRoute;