import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function EmailVerified() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setErrorMessage('No verification token found. Please check your email link.')
      return
    }

    try {
      // Store the token in localStorage (same as login does)
      localStorage.setItem('authToken', token)
      
      // Decode the token to get expiry time
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid token format')
      }

      const decoded = JSON.parse(atob(parts[1]))
      const expiresAt = new Date(decoded.exp * 1000).toISOString()

      // Store auth info
      localStorage.setItem('expiresAt', expiresAt)
      localStorage.setItem('userEmail', decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || decoded.email || '')

      setStatus('success')

      // Redirect to account setup (tier selection) after a short delay
      const timer = setTimeout(() => {
        navigate('/app/account-setup')
      }, 1500)

      return () => clearTimeout(timer)
    } catch (err) {
      setStatus('error')
      setErrorMessage('Failed to verify email. Please try logging in manually.')
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <img src="/JUSTSKU LOGO Horizontal.png" alt="JUSTSKU" className="h-12" />
          </div>
          <h1 className="text-center text-3xl font-bold text-blue-600 mb-2">JUSTSKU</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {status === 'loading' && (
            <div className="text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="text-lg font-medium text-gray-900">Verifying your email...</h2>
              <p className="text-sm text-gray-600">Please wait while we confirm your email address.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">Email Verified!</h2>
              <p className="text-sm text-gray-600">
                Your email has been verified successfully. Redirecting to membership setup...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-lg font-medium text-gray-900">Verification Failed</h2>
              <p className="text-sm text-gray-600">{errorMessage}</p>
              <div className="pt-4">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
