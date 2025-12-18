import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Users, AlertCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface InvitationData {
  customerName: string;
  invitedEmail: string;
  invitationType: string;
  invitedBy: string;
  expiresAt: string;
}

export default function InvitationAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`/api/invitation/${token}`);
      
      if (response.ok) {
        const data = await response.json();
        setInvitation(data);
      } else {
        const errorText = await response.text();
        setError(errorText || 'Invitation not found');
      }
    } catch (err) {
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to login with return URL
      navigate(`/login?returnUrl=/invitation/${token}`);
      return;
    }

    setAccepting(true);
    try {
      const response = await fetch(`/api/invitation/${token}/accept`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        navigate('/app', { 
          state: { message: `Successfully joined ${invitation?.customerName}!` }
        });
      } else {
        const errorText = await response.text();
        setError(errorText || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleSignupAndAccept = () => {
    navigate(`/signup?invitation=${token}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/JUSTSKU LOGO Horizontal.png" alt="JUSTSKU" className="h-12" />
          </div>
          <h1 className="text-center text-3xl font-bold text-blue-600 mb-2">JUSTSKU</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center mb-6">
            <Users className="mx-auto h-12 w-12 text-blue-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {invitation?.invitationType === 'SIGNUP' ? 'Join Team Invitation' : 'Team Invitation'}
            </h2>
            <p className="text-gray-600">
              <strong>{invitation?.invitedBy}</strong> has invited you to join{' '}
              <strong>{invitation?.customerName}</strong> on JUSTSKU
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center text-blue-800 text-sm">
              <Clock className="w-4 h-4 mr-2" />
              Invitation expires: {invitation?.expiresAt ? new Date(invitation.expiresAt).toLocaleDateString() : 'Unknown'}
            </div>
          </div>

          {invitation?.invitationType === 'SIGNUP' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 text-center">
                You'll need to create a JUSTSKU account to join the team.
              </p>
              <button
                onClick={handleSignupAndAccept}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-semibold"
              >
                Create Account & Join Team
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {user ? (
                <>
                  <p className="text-sm text-gray-600 text-center">
                    Click below to join <strong>{invitation?.customerName}</strong> with your existing account.
                  </p>
                  <button
                    onClick={handleAcceptInvitation}
                    disabled={accepting}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-semibold disabled:opacity-50"
                  >
                    {accepting ? 'Joining...' : 'Join Team'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 text-center">
                    Please sign in to your JUSTSKU account to accept this invitation.
                  </p>
                  <button
                    onClick={() => navigate(`/login?returnUrl=/invitation/${token}`)}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 font-semibold"
                  >
                    Sign In to Accept
                  </button>
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}