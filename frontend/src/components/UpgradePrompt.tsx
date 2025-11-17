import React from 'react';
import { Crown, ArrowRight } from 'lucide-react';
import { useMembership } from '../contexts/MembershipContext';
import { membershipService } from '../api/membershipService';

interface UpgradePromptProps {
  reportName: string;
  reportDisplayName: string;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ reportName, reportDisplayName }) => {
  const { membershipInfo } = useMembership();
  
  const requiredLevel = membershipService.getRequiredLevel(reportName);
  const requiredLevelName = membershipService.getLevelName(requiredLevel);
  const currentLevelName = membershipInfo ? membershipService.getLevelName(membershipInfo.currentLevel) : 'Unknown';

  const requiredTier = membershipInfo?.allTiers.find(tier => tier.level === requiredLevel);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Crown className="w-8 h-8 text-yellow-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Upgrade Required
        </h1>
        
        <p className="text-gray-600 mb-6">
          The <strong>{reportDisplayName}</strong> requires a <strong>{requiredLevelName}</strong> membership or higher.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Current Plan:</span>
            <span className="font-medium text-gray-900">{currentLevelName}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-2">
            <span className="text-gray-500">Required Plan:</span>
            <span className="font-medium text-yellow-600">{requiredLevelName}</span>
          </div>
        </div>

        {requiredTier && (
          <div className="text-left mb-6">
            <h3 className="font-medium text-gray-900 mb-2">{requiredLevelName} Features:</h3>
            <ul className="space-y-1">
              {requiredTier.features.map((feature, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center">
                  <ArrowRight className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
            Upgrade to {requiredLevelName}
          </button>
          
          <button 
            onClick={() => window.history.back()}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          Contact support if you have questions about upgrading your plan.
        </p>
      </div>
    </div>
  );
};

export default UpgradePrompt;