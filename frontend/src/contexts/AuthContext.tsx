import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface User {
  id: string
  email: string
  roles: string[]
  customerId?: number
  customerName?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, expires: string) => void
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
  hasRole: (role: string) => boolean
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
        setUser(userData)
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

  const login = (email: string, _expires: string) => {
    setUser({
      id: '', // Will be populated by checkAuthStatus
      email,
      roles: []
    })
    // Cookie is already set by the server, just update state
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

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) || false
  }

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    isLoading,
    hasRole
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}