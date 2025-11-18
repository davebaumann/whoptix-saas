import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { MembershipProvider } from './contexts/MembershipContext'
import ProtectedRoute from './components/ProtectedRoute'
import DefaultRoute from './pages/DefaultRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import AgingInventoryReport from './pages/AgingInventoryReport'
import FinancialWarehouseReport from './pages/FinancialWarehouseReport'
import Locations from './pages/Locations'
import Performance from './pages/Performance'
import InventoryTurnoverReport from './pages/InventoryTurnoverReport'
import LowStockReport from './pages/LowStockReport'
import LowStockAdmin from './pages/LowStockAdmin'
import AdminDashboard from './pages/AdminDashboard'
import CustomerManagement from './pages/CustomerManagement'
import TierConfigPage from './pages/TierConfigPage'
import MembershipUpgrade from './pages/MembershipUpgrade'
import LandingPage from './pages/LandingPage'
import TermsOfService from './pages/TermsOfService'
import PrivacyPolicy from './pages/PrivacyPolicy'

function App() {
  return (
    <AuthProvider>
      <MembershipProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                  <Route path="/" element={<DefaultRoute />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/aging-inventory" element={<AgingInventoryReport />} />
                  <Route path="/financial-warehouse" element={<FinancialWarehouseReport />} />
                  <Route path="/locations" element={<Locations />} />
                  <Route path="/performance" element={<Performance />} />
                  <Route path="/inventory-turnover" element={<InventoryTurnoverReport />} />
                  <Route path="/low-stock" element={<LowStockReport />} />
                  <Route path="/low-stock-admin" element={<LowStockAdmin />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/customers" element={<CustomerManagement />} />
                  <Route path="/admin/tiers" element={<TierConfigPage />} />
                  <Route path="/membership/upgrade" element={<MembershipUpgrade />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      </MembershipProvider>
    </AuthProvider>
  )
}

export default App
