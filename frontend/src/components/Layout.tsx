import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMembership } from '../contexts/MembershipContext'
import Footer from './Footer'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { membershipInfo, canAccessReport } = useMembership()
  
  // Admin navigation items
  const adminNavItems = [
    { path: '/app/admin', label: 'Admin Dashboard', icon: '⚙️' },
    { path: '/app/admin/customers', label: 'Customers', icon: '🏢' },
    { path: '/app/admin/tiers', label: 'Tier Configuration', icon: '👑' },
  ]

  const allNavItems = [
    { path: '/app/', label: 'Picker Dashboard', icon: '📦', reportName: null },
    { path: '/app/aging-inventory', label: 'Aging Inventory', icon: '⏰', reportName: 'aging-inventory' },
    { path: '/app/channel-performance', label: 'Channel Performance', icon: '🌐', reportName: 'channel-performance' },
    { path: '/app/demand-forecast', label: 'Demand Forecast', icon: '🔮', reportName: 'demand-forecast' },
    { path: '/app/financial-warehouse', label: 'Financial Report', icon: '💰', reportName: 'financial-warehouse' },
    { path: '/app/inventory', label: 'Inventory Report', icon: '📊', reportName: 'inventory' },
    { path: '/app/locations', label: 'Locations Report', icon: '📍', reportName: 'locations' },
    { path: '/app/low-stock', label: 'Low Stock Report', icon: '⚠️', reportName: 'low-stock' },
    { path: '/app/performance', label: 'Performance Metrics', icon: '📈', reportName: 'performance' },
    { path: '/app/picker-analytics', label: 'Picker Analytics', icon: '👥', reportName: 'picker-analytics' },
    { path: '/app/profitability', label: 'Profitability Report', icon: '💹', reportName: 'profitability' },
  ]

  // Use admin navigation for system admin users, customer navigation for regular users
  const navItems = user?.isSystemAdmin ? adminNavItems : allNavItems.filter(item => {
    // Hide Picker Dashboard for users without subscription or SkuVault association
    if (item.path === '/app/' && (!user?.customerId || !membershipInfo?.currentLevel)) {
      return false
    }
    if (item.reportName && !canAccessReport(item.reportName)) return false
    return true
  })

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-2" style={{ minHeight: '56px' }}>
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <img src="/JUSTSKU LOGO Horizontal.png" alt="JUSTSKU" className="h-12 md:h-16 lg:h-20" style={{ maxHeight: '56px', width: 'auto' }} />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user?.email}
                {user?.isSystemAdmin ? (
                  <span className="ml-2 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                    System Admin
                  </span>
                ) : user?.isAccountAdmin ? (
                  <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                    Account Admin
                  </span>
                ) : membershipInfo?.currentLevelName && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                    {membershipInfo.currentLevelName} Plan
                  </span>
                )}
              </span>
              <Link
                to="/app/account-settings"
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Account Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
              <button
                onClick={handleLogout}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1">
        <aside className="w-64 bg-white shadow-sm min-h-[calc(100vh-4rem)]">
          <nav className="mt-5 px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                >
                  <span className="mr-3 text-xl">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>

      <Footer />
    </div>
  )
}
