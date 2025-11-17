import { useState, useEffect } from 'react'
import { useMembership } from '../contexts/MembershipContext'
import { useAuth } from '../contexts/AuthContext'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Crown, Shield, Star, Zap, Check, X } from 'lucide-react'

// Initialize Stripe - you'll need to replace with your actual publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key_here')

interface MembershipPlan {
  level: number
  name: string
  price: number
  priceId: string // Stripe Price ID
  icon: React.ReactNode
  color: string
  gradient: string
  features: string[]
  popular?: boolean
}

const membershipPlans: MembershipPlan[] = [
  {
    level: 2,
    name: 'Standard',
    price: 59,
    priceId: 'price_standard_monthly',
    icon: <Star className="w-8 h-8" />,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-600',
    features: [
      'SkuVault Integration',
      'Low Stock Alerts',
      'Email Notifications',
      'Threshold Management',
      'Basic Reports',
      'Priority Support'
    ],
    popular: true
  },
  {
    level: 3,
    name: 'Premium',
    price: 99,
    priceId: 'price_premium_monthly',
    icon: <Crown className="w-8 h-8" />,
    color: 'text-yellow-600',
    gradient: 'from-yellow-500 to-yellow-600',
    features: [
      'All Standard Features',
      'Aging Inventory Reports',
      'Financial Analysis',
      'Location Optimization',
      'Advanced Analytics',
      'Phone Support',
      'Custom Integrations'
    ]
  },
  {
    level: 4,
    name: 'Enterprise',
    price: 199,
    priceId: 'price_enterprise_monthly',
    icon: <Zap className="w-8 h-8" />,
    color: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-600',
    features: [
      'All Premium Features',
      'Performance Analytics',
      'Velocity Tracking',
      'Turnover Analysis',
      'Growth Trends',
      'Top Performers',
      'Dedicated Account Manager',
    ]
  }
]

interface CheckoutFormProps {
  plan: MembershipPlan
  onSuccess: () => void
  onCancel: () => void
}

function CheckoutForm({ plan, onSuccess, onCancel }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsProcessing(true)
    setError('')

    const cardElement = elements.getElement(CardElement)

    if (!cardElement) {
      setError('Card element not found')
      setIsProcessing(false)
      return
    }

    try {
      // Create payment intent on your backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          priceId: plan.priceId,
          email: user?.email
        })
      })

      const { clientSecret, subscriptionId } = await response.json()

      // Confirm the payment
      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email: user?.email,
          },
        },
      })

      if (confirmError) {
        setError(confirmError.message || 'Payment failed')
      } else {
        // Payment succeeded - update membership on backend
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/membership/admin/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            customerId: user?.customerId,
            newLevel: plan.level,
            reason: `Stripe subscription upgrade to ${plan.name}`,
            subscriptionId
          })
        })

        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
    },
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Upgrade to {plan.name} - ${plan.price}/month
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Card Details
            </label>
            <div className="p-3 border border-gray-300 rounded-md">
              <CardElement options={cardElementOptions} />
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
            >
              {isProcessing ? 'Processing...' : `Pay $${plan.price}/month`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function MembershipUpgrade() {
  const { membershipInfo } = useMembership()
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  const currentLevel = membershipInfo?.currentLevel || 1

  const handleUpgrade = (plan: MembershipPlan) => {
    if (plan.level <= currentLevel) return
    setSelectedPlan(plan)
  }

  const handleSuccess = () => {
    setSelectedPlan(null)
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      // Refresh the page to update membership info
      window.location.reload()
    }, 2000)
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Upgrade Successful!
          </h2>
          <p className="text-gray-600">
            Your membership has been updated. Redirecting...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Membership Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Unlock powerful inventory management features with our flexible membership tiers. 
            Upgrade anytime to access more advanced analytics and reporting capabilities.
          </p>
          {membershipInfo && (
            <div className="mt-4 inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-blue-700">
                Current Plan: <strong>{membershipInfo.currentLevelName}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {membershipPlans.map((plan) => {
            const isCurrentPlan = plan.level === currentLevel
            const canUpgrade = plan.level > currentLevel
            const isDowngrade = plan.level < currentLevel

            return (
              <div
                key={plan.level}
                className={`relative bg-white rounded-lg shadow-lg border-2 transition-all duration-200 ${
                  plan.popular 
                    ? 'border-blue-500 scale-105' 
                    : isCurrentPlan 
                      ? 'border-green-500'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="p-6">
                  {/* Plan Header */}
                  <div className="text-center mb-6">
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${plan.gradient} text-white mb-4`}>
                      {plan.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="text-4xl font-bold text-gray-900 mb-1">
                      ${plan.price}
                      <span className="text-lg font-normal text-gray-600">/month</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={!canUpgrade}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                      isCurrentPlan
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : canUpgrade
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isCurrentPlan 
                      ? 'Current Plan'
                      : canUpgrade 
                        ? `Upgrade to ${plan.name}`
                        : isDowngrade
                          ? 'Downgrade (Contact Support)'
                          : 'Get Started'
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I change my plan anytime?</h3>
              <p className="text-gray-600 text-sm">
                Yes! You can upgrade your plan at any time. For downgrades, please contact our support team.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Is there a setup fee?</h3>
              <p className="text-gray-600 text-sm">
                No setup fees! You only pay the monthly subscription fee for your chosen plan.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-600 text-sm">
                We accept all major credit cards through our secure Stripe payment processor.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Can I cancel anytime?</h3>
              <p className="text-gray-600 text-sm">
                Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <Elements stripe={stripePromise}>
          <CheckoutForm
            plan={selectedPlan}
            onSuccess={handleSuccess}
            onCancel={() => setSelectedPlan(null)}
          />
        </Elements>
      )}
    </div>
  )
}