import { useState } from 'react'
import { useLocation } from 'react-router-dom'

interface LoginForm {
  email: string
  password: string
}

export default function Login() {
  const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' })
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('') // Clear error when user types
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Call login endpoint directly to check for 2FA requirement
      const loginResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json()
        throw new Error(errorData.message || 'Invalid credentials')
      }

      const loginData = await loginResponse.json()

      // Check if 2FA is required
      if (loginData.requiresTwoFactor) {
        setRequiresTwoFactor(true)
        setTempToken(loginData.tempToken)
        setError('')
        return
      }

      // No 2FA needed, redirect
      const isAdmin = loginData.roles?.includes('Admin') || false
      if (isAdmin) {
        window.location.href = '/app/admin'
      } else {
        window.location.href = from === '/' ? '/app/dashboard' : from
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Call login-2fa endpoint with the temp token
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login-2fa`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ code: twoFactorCode })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Invalid 2FA code')
      }

      // Successful 2FA verification, redirect
      const meResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
      })
      
      if (meResponse.ok) {
        const userData = await meResponse.json()
        const isAdmin = userData.roles?.includes('Admin') || false
        
        if (isAdmin) {
          window.location.href = '/app/admin'
        } else {
          window.location.href = from === '/' ? '/app/dashboard' : from
        }
      } else {
        window.location.href = from === '/' ? '/app/dashboard' : from
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '2FA verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setRequiresTwoFactor(false)
    setTwoFactorCode('')
    setTempToken('')
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-4">
            <img src="/JUSTSKU LOGO.png" alt="JUSTSKU" className="h-12" />
          </div>
          <h1 className="text-center text-3xl font-bold text-gray-900">JUSTSKU</h1>
          {!requiresTwoFactor ? (
            <>
              <h2 className="mt-6 text-center text-xl font-semibold text-gray-700">
                Sign in to your account
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Access your warehouse management dashboard
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-6 text-center text-xl font-semibold text-gray-700">
                Two-Factor Authentication
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Enter the 6-digit code from your authenticator app
              </p>
            </>
          )}
        </div>
        
        {!requiresTwoFactor ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleInputChange}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleTwoFactorSubmit}>
            <div>
              <label htmlFor="twoFactorCode" className="block text-sm font-medium text-gray-700">
                Verification Code
              </label>
              <input
                id="twoFactorCode"
                name="twoFactorCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={twoFactorCode}
                onChange={(e) => {
                  setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setError('')
                }}
                className="mt-1 appearance-none relative block w-full px-3 py-2 text-center text-2xl tracking-widest border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="000000"
                autoFocus
              />
              <p className="mt-2 text-xs text-gray-500 text-center">
                Enter the 6-digit code from your authenticator app or use a backup code
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBackToLogin}
                className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading || twoFactorCode.length !== 6}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Verify'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}