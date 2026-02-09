export interface MembershipLevel {
  Standard: 2;
  Premium: 3;
  Enterprise: 4;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5239';

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
  monthlyCost: number;
  renewalDate: string;
  isActive: boolean;
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
  BASIC: 1,
  STANDARD: 2,
  PREMIUM: 3,
  ENTERPRISE: 4
} as const;

export const membershipService = {
  async getMembershipInfo(customerId: number): Promise<MembershipInfo> {
    const url = `${API_BASE_URL}/api/membership/customer/${customerId}`;
    console.log('membershipService: Fetching from', url, 'for customerId:', customerId);
    
    // Check if admin is impersonating a customer
    const adminViewingAs = sessionStorage.getItem('adminViewingAs');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (adminViewingAs) {
      try {
        const impersonationData = JSON.parse(adminViewingAs);
        if (impersonationData.customerId) {
          headers['X-Impersonate-Customer-Id'] = impersonationData.customerId.toString();
          console.log('membershipService: Adding impersonation header for customer:', impersonationData.customerId);
        }
      } catch (e) {
        console.error('Failed to parse admin viewing context:', e);
      }
    }
    
    const response = await fetch(url, {
      credentials: 'include',
      headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`membershipService: API returned ${response.status}:`, errorText);
      throw new Error(`Failed to get membership information: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('membershipService: Received data:', data);
    return data;
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
          'Up to 2 user accounts'
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
          'Up to 5 user accounts'
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
          'Up to 10 user accounts'
        ],
        isCurrentTier: false,
        canUpgrade: false
      }
    ];
  },

  async getAllCustomersWithMembership(): Promise<CustomerWithMembership[]> {
    const response = await fetch(`${API_BASE_URL}/api/membership/admin/customers`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get customers with membership');
    }
    
    return response.json();
  },

  async updateMembership(customerId: number, newLevel: number, reason?: string) {
    const response = await fetch(`${API_BASE_URL}/api/membership/admin/update`, {
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
      'channel-performance': MEMBERSHIP_LEVELS.BASIC,
      'profitability': MEMBERSHIP_LEVELS.PREMIUM,
      'demand-forecast': MEMBERSHIP_LEVELS.PREMIUM,
      'financial-warehouse': MEMBERSHIP_LEVELS.PREMIUM,
      'locations': MEMBERSHIP_LEVELS.PREMIUM,
      'performance': MEMBERSHIP_LEVELS.ENTERPRISE,
      'picker-analytics': MEMBERSHIP_LEVELS.ENTERPRISE
    };

    const requiredLevel = reportRequirements[reportName];
    return membershipLevel >= requiredLevel;
  },

  getRequiredLevel(reportName: string): number {
    const reportRequirements: Record<string, number> = {
      'inventory': MEMBERSHIP_LEVELS.BASIC,
      'low-stock': MEMBERSHIP_LEVELS.STANDARD,
      'aging-inventory': MEMBERSHIP_LEVELS.PREMIUM,
      'channel-performance': MEMBERSHIP_LEVELS.BASIC,
      'profitability': MEMBERSHIP_LEVELS.PREMIUM,
      'demand-forecast': MEMBERSHIP_LEVELS.PREMIUM,
      'financial-warehouse': MEMBERSHIP_LEVELS.PREMIUM,
      'locations': MEMBERSHIP_LEVELS.PREMIUM,
      'performance': MEMBERSHIP_LEVELS.ENTERPRISE,
      'picker-analytics': MEMBERSHIP_LEVELS.ENTERPRISE
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