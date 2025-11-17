import React from 'react';
import { useMembership } from '../contexts/MembershipContext';
import UpgradePrompt from './UpgradePrompt';

interface WithMembershipCheckProps {
  reportName: string;
  reportDisplayName: string;
  children: React.ReactNode;
}

const WithMembershipCheck: React.FC<WithMembershipCheckProps> = ({ 
  reportName, 
  reportDisplayName, 
  children 
}) => {
  const { canAccessReport, loading } = useMembership();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!canAccessReport(reportName)) {
    return <UpgradePrompt reportName={reportName} reportDisplayName={reportDisplayName} />;
  }

  return <>{children}</>;
};

export default WithMembershipCheck;