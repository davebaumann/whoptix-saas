export interface MembershipLevel {
  Standard: 2;
  Premium: 3;
  Enterprise: 4;
}

export interface MembershipTier {
  level: number;
  name: string;
  description: string;
  features: string[];
  isCurrentTier: boolean;
  canUpgrade: boolean;
}

export interface MembershipInfo {
  currentLevel: number;
  currentLevelName: string;
  availableReports: string[];
  allTiers: MembershipTier[];
}

export interface CustomerWithMembership {
  id: number;
  name: string;
  email: string;
  membershipLevel: number;
  membershipLevelName: string;
  availableReports: number;
  lastSyncedAt: string;
}

export const MEMBERSHIP_LEVELS = {
  STANDARD: 2,
  PREMIUM: 3,
  ENTERPRISE: 4
} as const;

export const membershipService = {
  async getMembershipInfo(customerId: number): Promise<MembershipInfo> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/membership/customer/${customerId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get membership information');
    }
    
    return response.json();
  },

  async getMembershipTiers(): Promise<MembershipTier[]> {
    return [
      {
        level: 2,
        name: 'Standard',
        description: 'Essential SkuVault optimization features for growing businesses',
        features: [
          'SkuVault integration',
          'Low stock alerts',
          'Automated notifications',
          'Priority support',
          'Up to 5 user accounts'
        ],
        isCurrentTier: false,
        canUpgrade: true
      },
      {
        level: 3,
        name: 'Premium',
        description: 'Comprehensive analytics and reporting for established businesses',
        features: [
          'Everything in Standard',
          'Aging inventory analysis',
          'Financial reporting',
          'Location optimization',
          'Advanced analytics',
          'Phone support',
          'Up to 20 user accounts'
        ],
        isCurrentTier: false,
        canUpgrade: true
      },
      {
        level: 4,
        name: 'Enterprise',
        description: 'Full-featured solution for large organizations',
        features: [
          'Everything in Premium',
          'Performance analytics',
          'Velocity tracking',
          'Turnover analysis',
          'Custom reporting',
          'Dedicated account manager',
          'Unlimited user accounts',
          'API access'
        ],
        isCurrentTier: false,
        canUpgrade: false
      }
    ];
  },

  async getAllCustomersWithMembership(): Promise<CustomerWithMembership[]> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/membership/admin/customers`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get customers with membership');
    }
    
    return response.json();
  },

  async updateMembership(customerId: number, newLevel: number, reason?: string) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/membership/admin/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        customerId,
        newLevel,
        reason
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Membership update failed with status ${response.status}: ${errorText}`);
      throw new Error(`Failed to update membership (${response.status}): ${errorText}`);
    }
    
    return response.json();
  },

  canAccessReport(membershipLevel: number, reportName: string): boolean {
    const reportRequirements: Record<string, number> = {
      'inventory': MEMBERSHIP_LEVELS.BASIC,
      'low-stock': MEMBERSHIP_LEVELS.STANDARD,
      'aging-inventory': MEMBERSHIP_LEVELS.PREMIUM,
      'financial-warehouse': MEMBERSHIP_LEVELS.PREMIUM,
      'locations': MEMBERSHIP_LEVELS.PREMIUM,
      'performance': MEMBERSHIP_LEVELS.ENTERPRISE
    };

    const requiredLevel = reportRequirements[reportName];
    return membershipLevel >= requiredLevel;
  },

  getRequiredLevel(reportName: string): number {
    const reportRequirements: Record<string, number> = {
      'inventory': MEMBERSHIP_LEVELS.BASIC,
      'low-stock': MEMBERSHIP_LEVELS.STANDARD,
      'aging-inventory': MEMBERSHIP_LEVELS.PREMIUM,
      'financial-warehouse': MEMBERSHIP_LEVELS.PREMIUM,
      'locations': MEMBERSHIP_LEVELS.PREMIUM,
      'performance': MEMBERSHIP_LEVELS.ENTERPRISE
    };

    return reportRequirements[reportName] || MEMBERSHIP_LEVELS.ENTERPRISE;
  },

  getLevelName(level: number): string {
    const names: Record<number, string> = {
      [MEMBERSHIP_LEVELS.BASIC]: 'Basic',
      [MEMBERSHIP_LEVELS.STANDARD]: 'Standard',
      [MEMBERSHIP_LEVELS.PREMIUM]: 'Premium',
      [MEMBERSHIP_LEVELS.ENTERPRISE]: 'Enterprise'
    };
    return names[level] || 'Unknown';
  }
};