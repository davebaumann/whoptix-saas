import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5239';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const customer = searchParams.get('customer');
  const role = searchParams.get('role');
  const error = searchParams.get('error');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(true);

  useEffect(() => {
    if (error === 'invalid') {
      setErrorMessage('Invalid or expired invitation link.');
    }
  }, [error]);

  useEffect(() => {
    // Check if user already has an account
    const checkEmail = async () => {
      if (!email) {
        setCheckingEmail(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/userinvitation/check-email/${encodeURIComponent(email)}`);
        const data = await response.json();
        setUserExists(data.exists);
      } catch (err) {
        console.error('Error checking email:', err);
      } finally {
        setCheckingEmail(false);
      }
    };
    
    checkEmail();
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // For existing users, no password needed
    if (userExists) {
      handleAcceptExisting();
      return;
    }

    // For new users, validate password
    if (!password || !confirmPassword) {
      setErrorMessage('Please enter a password.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    handleCreateAccount();
  };

  const handleCreateAccount = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/userinvitation/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        setErrorMessage(error || 'Failed to create account. Please try again.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setErrorMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptExisting = async () => {
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/userinvitation/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password: '', // No password needed for existing users
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        setErrorMessage(error || 'Failed to connect account. Please try again.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setErrorMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (error === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Invalid Invitation</h2>
            <p className="mt-2 text-gray-600">
              The invitation link is invalid or has expired. Please contact the person who invited you to request a new invitation.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">
              {userExists ? 'Account Connected!' : 'Account Created!'}
            </h2>
            <p className="mt-2 text-gray-600">
              {userExists 
                ? 'Your account has been successfully connected to ' + customer 
                : 'Your account has been created successfully.'} Redirecting to login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (checkingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading invitation details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {userExists ? 'Connect Your Account' : 'Accept Invitation'}
          </h2>
          {customer && (
            <p className="mt-2 text-center text-sm text-gray-600">
              You've been invited to join <strong>{customer}</strong> as <strong>{role}</strong>
            </p>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{errorMessage}</h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email || ''}
              disabled
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 sm:text-sm"
            />
          </div>

          {userExists ? (
            <div className="rounded-md bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                We found an existing account with this email. Click below to connect it to {customer}.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="At least 8 characters"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must contain uppercase, lowercase, and numbers
                </p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (userExists ? 'Connect Account' : 'Accept Invitation & Create Account')}
          </button>
        </form>
      </div>
    </div>
  );
}
