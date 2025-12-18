import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Crown, Star, Zap, Users } from 'lucide-react';

const membershipTiers = [
  {
    level: 2,
    name: 'Standard',
    price: '$29/month',
    description: 'Essential SkuVault optimization features for growing businesses',
    features: [
      'SkuVault integration',
      'Low stock alerts',
      'Automated notifications',
      'Priority support',
      'Up to 2 user accounts'
    ],
    icon: <Star className="w-8 h-8 text-blue-500" />,
    color: 'border-blue-200 hover:border-blue-300'
  },
  {
    level: 3,
    name: 'Premium',
    price: '$79/month',
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
    icon: <Crown className="w-8 h-8 text-yellow-500" />,
    color: 'border-yellow-200 hover:border-yellow-300',
    popular: true
  },
  {
    level: 4,
    name: 'Enterprise',
    price: '$199/month',
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
    icon: <Zap className="w-8 h-8 text-purple-500" />,
    color: 'border-purple-200 hover:border-purple-300'
  }
];

export default function AccountSetup() {
  const [selectedOption, setSelectedOption] = useState<'tier' | 'associate' | null>(null);

  const navigate = useNavigate();

  const handleTierSelection = (tierLevel: number) => {
    // Navigate to contract review with selected tier
    navigate(`/app/contract-review?tier=${tierLevel}`);
  };

  const handleAssociateAccount = () => {
    // Placeholder for future implementation
    alert('Account association feature coming soon!');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-center text-3xl font-bold text-blue-600 mb-2">JUSTSKU</h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verified!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Your email has been successfully verified. Now let's set up your account.
          </p>
        </div>

        {!selectedOption && (
          <div className="bg-white rounded-lg shadow p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
              How would you like to proceed?
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Select Tier Option */}
              <div 
                onClick={() => setSelectedOption('tier')}
                className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <div className="text-center">
                  <Crown className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Start New Subscription
                  </h4>
                  <p className="text-sm text-gray-600">
                    Choose a membership tier and start your own JUSTSKU subscription with full access to all features.
                  </p>
                </div>
              </div>

              {/* Associate Account Option */}
              <div 
                onClick={() => setSelectedOption('associate')}
                className="border-2 border-gray-200 rounded-lg p-6 cursor-pointer hover:border-green-300 hover:bg-green-50 transition-colors"
              >
                <div className="text-center">
                  <Users className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Join Existing Account
                  </h4>
                  <p className="text-sm text-gray-600">
                    Associate your account with an existing JUSTSKU customer account as an additional user.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedOption === 'tier' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                Choose Your Plan
              </h3>
              <p className="text-gray-600">
                Select the membership tier that best fits your business needs
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {membershipTiers.map((tier) => (
                <div
                  key={tier.level}
                  className={`relative bg-white rounded-lg shadow-lg border-2 ${tier.color} p-6 cursor-pointer transition-all hover:shadow-xl`}
                  onClick={() => handleTierSelection(tier.level)}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center mb-6">
                    {tier.icon}
                    <h4 className="text-xl font-semibold text-gray-900 mt-2">
                      {tier.name}
                    </h4>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {tier.price}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      {tier.description}
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                    Select {tier.name}
                  </button>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setSelectedOption(null)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← Back to options
              </button>
            </div>
          </div>
        )}

        {selectedOption === 'associate' && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <Users className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Join Existing Account
              </h3>
              <p className="text-gray-600 mb-6">
                This feature is coming soon! You'll be able to associate your account with an existing JUSTSKU customer.
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={handleAssociateAccount}
                  disabled
                  className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md cursor-not-allowed"
                >
                  Associate Account (Coming Soon)
                </button>
                
                <button
                  onClick={() => setSelectedOption(null)}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50"
                >
                  Back to Options
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Questions? Contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}