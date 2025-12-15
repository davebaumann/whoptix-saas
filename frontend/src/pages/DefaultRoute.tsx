import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Dashboard from '../pages/Dashboard';

const DefaultRoute: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user has a role property and is admin, redirect
    if (user && (user as any).role === 'Admin') {
      navigate('/app/admin', { replace: true });
    }
  }, [user, navigate]);

  // For non-admin users, show the regular dashboard
  if (!user || (user as any).role !== 'Admin') {
    return <Dashboard />;
  }

  // For admin users, return null while redirecting
  return null;
};

export default DefaultRoute;