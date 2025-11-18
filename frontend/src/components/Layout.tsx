import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMembership } from '../contexts/MembershipContext'
import { Crown } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user, logout, hasRole } = useAuth()
  const { canAccessReport, membershipInfo } = useMembership()
  
  // All possible navigation items with their membership requirements (for customers only)
  const customerNavItems = [
    { path: '/app/', label: 'Picker/Packer Dashboard', icon: '📦', reportName: 'inventory' },
    { path: '/app/inventory', label: 'Inventory Report', icon: '📊', reportName: 'inventory' },
    { path: '/app/low-stock', label: 'Low Stock Report', icon: '⚠️', reportName: 'low-stock' },
    { path: '/app/low-stock-admin', label: 'Low Stock Thresholds', icon: '⚙️', reportName: 'low-stock' },
    { path: '/app/aging-inventory', label: 'Aging Inventory', icon: '📅', reportName: 'aging-inventory' },
    { path: '/app/financial-warehouse', label: 'Financial Report', icon: '💰', reportName: 'financial-warehouse' },
    { path: '/app/locations', label: 'Locations Report', icon: '📍', reportName: 'locations' },
    { path: '/app/performance', label: 'Performance Metrics', icon: '📈', reportName: 'performance' },
    { path: '/app/inventory-turnover', label: 'Inventory Turnover', icon: '🔄', reportName: 'inventory-turnover' },
    { path: '/app/membership/upgrade', label: 'Upgrade Membership', icon: '⭐', reportName: 'inventory' }, // Available to all customers
  ]

  // Admin navigation items (only for admins)
  const adminNavItems = [
    { path: '/app/admin', label: 'Admin Dashboard', icon: '🏠' },
    { path: '/app/admin/customers', label: 'Customer Management', icon: '👥' },
    { path: '/app/admin/tiers', label: 'Tier Configuration', icon: '👑' },
  ]

  // Determine navigation items based on user role
  const navItems = hasRole('Admin') 
    ? adminNavItems
    : customerNavItems.filter(item => 
        item.path === '/app/' || canAccessReport(item.reportName)
      )

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const getCurrentLevelName = () => {
    if (!membershipInfo) return 'Loading...';
    return membershipInfo.currentLevelName;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Whoptix</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                to="/app/membership/upgrade"
                className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 px-3 py-1 rounded-lg transition-colors cursor-pointer"
                title="Click to upgrade membership"
              >
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-700">
                  {getCurrentLevelName()}
                </span>
              </Link>
              <span className="text-sm text-gray-700">
                {user?.email}
              </span>
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

      <div className="flex">
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
    </div>
  )
}
