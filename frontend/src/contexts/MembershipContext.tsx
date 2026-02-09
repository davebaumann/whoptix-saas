import React, { createContext, useContext, useEffect, useState } from 'react';
import { MembershipInfo, membershipService } from '../api/membershipService';
import { useAuth } from './AuthContext';

interface MembershipContextType {
  membershipInfo: MembershipInfo | null;
  loading: boolean;
  error: string | null;
  refreshMembership: () => Promise<void>;
  canAccessReport: (reportName: string) => boolean;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export const MembershipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [membershipInfo, setMembershipInfo] = useState<MembershipInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Get effective customer ID (impersonated or own)
  const getEffectiveCustomerId = (): number | null => {
    // Check if admin is impersonating a customer
    const adminViewingAs = sessionStorage.getItem('adminViewingAs');
    if (adminViewingAs) {
      try {
        const impersonationData = JSON.parse(adminViewingAs);
        if (impersonationData.customerId) {
          return impersonationData.customerId;
        }
      } catch (e) {
        // Invalid impersonation data, fall through
      }
    }
    return user?.customerId || null;
  };

  const refreshMembership = async () => {
    const effectiveCustomerId = getEffectiveCustomerId();
    
    if (!effectiveCustomerId) {
      console.warn('MembershipProvider: No customerId found', { customerId: user?.customerId });
      setMembershipInfo(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching membership info for customerId:', effectiveCustomerId);
      
      // Small delay to ensure webhook has completed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const info = await membershipService.getMembershipInfo(effectiveCustomerId);
      console.log('Membership info received:', info);
      setMembershipInfo(info);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load membership information';
      setError(errorMsg);
      console.error('Error loading membership info:', err, { customerId: effectiveCustomerId });
    } finally {
      setLoading(false);
    }
  };

  const canAccessReport = (reportName: string): boolean => {
    if (!membershipInfo) return false;
    return membershipService.canAccessReport(membershipInfo.currentLevel, reportName);
  };

  useEffect(() => {
    refreshMembership();
  }, [user?.customerId]);

  // Listen for changes to adminViewingAs in sessionStorage
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('[MembershipContext] Admin viewing context changed, refreshing membership');
      refreshMembership();
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom events from AdminViewingBanner
    window.addEventListener('adminViewingAsChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('adminViewingAsChanged', handleStorageChange);
    };
  }, []);

  const value: MembershipContextType = {
    membershipInfo,
    loading,
    error,
    refreshMembership,
    canAccessReport
  };

  return (
    <MembershipContext.Provider value={value}>
      {children}
    </MembershipContext.Provider>
  );
};

export const useMembership = (): MembershipContextType => {
  const context = useContext(MembershipContext);
  if (context === undefined) {
    throw new Error('useMembership must be used within a MembershipProvider');
  }
  return context;
};