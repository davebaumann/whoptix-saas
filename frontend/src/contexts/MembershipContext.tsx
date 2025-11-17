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

  const refreshMembership = async () => {
    if (!user?.customerId) {
      setMembershipInfo(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const info = await membershipService.getMembershipInfo(user.customerId);
      setMembershipInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load membership information');
      console.error('Error loading membership info:', err);
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