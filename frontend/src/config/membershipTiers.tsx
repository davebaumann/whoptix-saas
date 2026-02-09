import { Star, Crown, Zap } from 'lucide-react'

export interface MembershipTier {
  level: number
  name: string
  price: number // Price in dollars
  priceId?: string // Stripe Price ID (for payment pages)
  icon?: React.ReactNode
  color: string
  gradient: string
  description?: string
  features: string[]
  popular?: boolean
}

export const MEMBERSHIP_TIERS: MembershipTier[] = [
  {
    level: 2,
    name: 'Standard',
    price: 99,
    priceId: 'price_standard_monthly',
    icon: <Star className="w-8 h-8" />,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    description: 'Essential SkuVault optimization features for growing businesses',
    features: [
      'SkuVault Integration',
      'Low Stock Reports',
      'Email Notifications',
      'Threshold Management',
      'Inventory Reports',
      '2 Users',
      'Email Support'
    ]
  },
  {
    level: 3,
    name: 'Premium',
    price: 199,
    priceId: 'price_premium_monthly',
    icon: <Crown className="w-8 h-8" />,
    color: 'text-yellow-600',
    gradient: 'from-yellow-500 to-yellow-600',
    description: 'Comprehensive analytics and reporting for established businesses',
    features: [
      'All Standard Features',
      'Low Stock Email Alerts',
      'Aging Inventory Reports',
      'Profitability Analysis',
      'Demand Forecasting',
      'Financial Warehouse Reports',
      'Location Optimization',
      'Advanced Analytics',
      '5 Users',
      'Email Support',
      'Phone Support'
    ],
    popular: true
  },
  {
    level: 4,
    name: 'Enterprise',
    price: 299,
    priceId: 'price_enterprise_monthly',
    icon: <Zap className="w-8 h-8" />,
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
    description: 'Full-featured solution for large organizations',
    features: [
      'All Premium Features',
      'Performance Analytics',
      'Velocity Tracking',
      'Inventory Turnover Reports',
      'Growth Trends',
      'Top/Bottom Performers',
      'Custom Integrations',
      '10 Users',
      'Dedicated Account Manager'
    ],
    popular: false
  }
]

// Helper functions
export const getTierByLevel = (level: number): MembershipTier | undefined => {
  return MEMBERSHIP_TIERS.find(tier => tier.level === level)
}

export const getTierInfo = (tier: string | number) => {
  const tierLevel = typeof tier === 'string' ? parseInt(tier) : tier
  const tierData = getTierByLevel(tierLevel)
  
  if (!tierData) {
    return { name: 'Unknown', price: 'N/A' }
  }
  
  return {
    name: tierData.name,
    price: `$${tierData.price}/month`
  }
}

export const formatPrice = (price: number): string => {
  return `$${price}/month`
}

export const getPriceInCents = (price: number): number => {
  return price * 100
}
