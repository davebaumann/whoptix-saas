import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle } from 'lucide-react';

const getTierInfo = (tier: string) => {
  const tierMap: Record<string, { name: string; price: string }> = {
    '2': { name: 'Standard', price: '$29/month' },
    '3': { name: 'Premium', price: '$79/month' },
    '4': { name: 'Enterprise', price: '$199/month' }
  };
  return tierMap[tier] || { name: 'Standard', price: '$29/month' };
};

export default function StripeSetup() {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  const tier = searchParams.get('tier') || '2';
  const tierInfo = getTierInfo(tier);

  const handleSetupPayment = async () => {
    setIsLoading(true);
    
    // TODO: Implement Stripe setup flow
    // For now, simulate setup and redirect to dashboard
    setTimeout(() => {
      setIsLoading(false);
      navigate('/app/dashboard');
    }, 2000);
  };

  const handleSkipForNow = () => {
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-center text-3xl font-bold text-blue-600 mb-2">Whoptix</h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Verified!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Contract accepted! Now let's set up your payment method for your {tierInfo.name} subscription.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-6">
            <CreditCard className="mx-auto h-12 w-12 text-blue-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Set Up Payment</h3>
            <p className="text-sm text-gray-600 mt-2">
              Complete your {tierInfo.name} subscription setup ({tierInfo.price}) to start using Whoptix.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleSetupPayment}
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Setting up payment...
                </span>
              ) : (
                'Set Up Payment Method'
              )}
            </button>

            <button
              onClick={handleSkipForNow}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Skip for now
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              You can set up payment later in your account settings. 
              Some features may be limited without an active subscription.
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Secure payment processing powered by Stripe
          </p>
        </div>
      </div>
    </div>
  );
}