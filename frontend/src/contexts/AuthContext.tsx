import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  customerId: number
  roles?: string[]
}

interface AuthContextType {
  user: User | null
  login: (email: string, expires: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check authentication status by making a request to a protected endpoint
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      // Make a request to a protected endpoint to verify authentication
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        credentials: 'include', // Include cookies
      })
      
      if (response.ok) {
        const userData = await response.json()
        // Set user data - use fallback customerId for now until proper association is implemented
        setUser({
          id: userData.id,
          email: userData.email,
          customerId: typeof userData.customerId === 'number' ? userData.customerId : 1 // Temporary fallback
        })
        
        if (typeof userData.customerId !== 'number') {
          console.warn('User has no customer association - using fallback customerId')
        }
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (_email: string, _expires: string) => {
    // Cookie is already set by the server, check auth status to get full user data
    await checkAuthStatus()
  }

  const logout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout request failed:', error)
    } finally {
      setUser(null)
    }
  }

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}