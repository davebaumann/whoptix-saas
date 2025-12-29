import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useMembership } from '../contexts/MembershipContext';

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const { refreshMembership } = useMembership();

  useEffect(() => {
    // Refresh membership data to update the dashboard with new tier
    const loadUpdatedMembership = async () => {
      await refreshMembership();
    };
    loadUpdatedMembership();
  }, [refreshMembership]);

  const handleConnectSkuVault = () => {
    navigate('/app/skuvault-connection');
  };

  const handleSkipForNow = () => {
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 rounded-full p-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Welcome to SkuVault SaaS
        </h1>

        {/* Subheading */}
        <p className="text-center text-gray-600 mb-6">
          Thank you for your subscription. You now have access to powerful warehouse management tools designed to optimize your operations.
        </p>

        {/* Benefits */}
        <div className="bg-blue-50 rounded-lg p-4 mb-8">
          <h2 className="font-semibold text-gray-900 mb-3">Improve your warehouse performance with:</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              Real-time inventory visibility and tracking
            </li>
            <li className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              Intelligent low-stock alerts and notifications
            </li>
            <li className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              Comprehensive analytics and actionable insights
            </li>
            <li className="flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              Seamless integration with your existing systems
            </li>
          </ul>
        </div>

        {/* Next Steps */}
        <p className="text-center text-sm text-gray-600 mb-6">
          To start syncing your SkuVault data, connect your account below:
        </p>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleConnectSkuVault}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Connect SkuVault Account
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={handleSkipForNow}
            className="w-full py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-900 font-medium rounded-lg transition"
          >
            Skip for Now
          </button>
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-500 text-center mt-6">
          You can connect your SkuVault account anytime from the dashboard settings.
        </p>
      </div>
    </div>
  );
}
