import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiClient } from '../api/client'

interface LoginForm {
  email: string
  password: string
}

export default function Login() {
  const [formData, setFormData] = useState<LoginForm>({ email: '', password: '' })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
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
      await apiClient.login(formData.email, formData.password)
      
      // Check if user is admin and redirect accordingly
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
      })
      
      if (response.ok) {
        const userData = await response.json()
        const isAdmin = userData.roles?.includes('Admin') || false
        
        // Redirect based on user type
        if (isAdmin) {
          window.location.href = '/app/admin'
        } else {
          window.location.href = from === '/' ? '/app/dashboard' : from
        }
      } else {
        window.location.href = from === '/' ? '/app/dashboard' : from
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        setError('Invalid email or password')
      } else {
        setError(err instanceof Error ? err.message : 'Login failed')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center mb-4">
            <img src="/JUSTSKU LOGO.png" alt="JUSTSKU" className="h-12" />
          </div>
          <h1 className="text-center text-3xl font-bold text-gray-900">JUSTSKU</h1>
          <h2 className="mt-6 text-center text-xl font-semibold text-gray-700">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your warehouse management dashboard
          </p>
        </div>
        
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

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Test credentials: <br />
              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                Kim.baumann@skuvault.com / P@ssw0rd!
              </span>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}