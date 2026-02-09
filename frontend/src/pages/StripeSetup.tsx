import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripeService } from '../api/stripeService';
import { useAuth } from '../contexts/AuthContext';
import { getTierInfo } from '../config/membershipTiers.tsx';

function PaymentForm({ tierInfo, clientSecret, onCouponChange }: { tierInfo: { name: string; price: string }; clientSecret: string; onCouponChange: (code: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Confirming payment with clientSecret:', clientSecret);
      
      // Submit the Payment Element form first
      const { error: submitError } = await elements.submit();
      
      if (submitError) {
        setError(submitError.message || 'Payment form submission failed');
        return;
      }
      
      // Then confirm the payment
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/app/payment-success`,
        },
      });

      if (stripeError) {
        console.error('Stripe error:', stripeError);
        setError(stripeError.message || 'Payment failed');
      } else {
        console.log('✓ Payment processing started');
        // Will redirect to return_url on success
      }
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCouponChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase();
    setCouponCode(code);
    onCouponChange(code);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Coupon Code (Optional)
        </label>
        <input
          type="text"
          value={couponCode}
          onChange={handleCouponChange}
          placeholder="Enter coupon code"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <PaymentElement />
      
      {error && (
        <div className="text-red-600 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || isLoading}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing payment...
          </span>
        ) : (
          `Pay ${tierInfo.price} - Start Subscription`
        )}
      </button>
    </form>
  );
}

export default function StripeSetup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | undefined>();
  
  const tier = searchParams.get('tier') || '2';
  const tierInfo = getTierInfo(tier);
  
  const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

  // Create payment intent on component mount
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        if (!user?.email) {
          setError('User email not found');
          return;
        }
        
        const priceId = await stripeService.getPriceIdFromTier(tier);
        const { clientSecret: secret } = await stripeService.createPaymentIntent({
          priceId,
          email: user.email,
          discountCode: couponCode
        });
        
        setClientSecret(secret);
        setError(null);
      } catch (err) {
        console.error('Failed to create payment intent:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize payment');
      } finally {
        setIsLoading(false);
      }
    };
    
    createPaymentIntent();
  }, [user?.email, tier]);

  const handleSkipForNow = () => {
    navigate('/app/account-settings');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Initializing payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="text-blue-600 hover:underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-center text-3xl font-bold text-blue-600 mb-2">JUSTSKU</h1>
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
              Complete your {tierInfo.name} subscription setup ({tierInfo.price}) to start using JUSTSKU.
            </p>
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentForm tierInfo={tierInfo} clientSecret={clientSecret} onCouponChange={setCouponCode} />
          </Elements>
          
          <div className="mt-4">
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