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
import AccountSettings from './pages/AccountSettings'
import UserManagement from './pages/UserManagement'
import StripeSetup from './pages/StripeSetup'
import AccountSetup from './pages/AccountSetup'
import ContractReview from './pages/ContractReview'
import EmailVerification from './pages/EmailVerification'
import LandingPage from './pages/LandingPage'
import LandingPageAB from './pages/LandingPageAB'
import TermsOfService from './pages/TermsOfService'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TestContact from './pages/TestContact'
import ContactUs from './pages/ContactUsNew'
import Support from './pages/Support'
import Status from './pages/Status'
import About from './pages/About'
import InvitationAccept from './pages/InvitationAccept'
import AcceptInvitation from './pages/AcceptInvitation'
import Demo from './pages/Demo'
import DemoDashboard from './pages/DemoDashboard'
import ProfitabilityReport from './pages/ProfitabilityReport'
import DemandForecast from './pages/DemandForecast'
import ChannelPerformance from './pages/ChannelPerformance'
import PickerAnalytics from './pages/PickerAnalytics'
import EmailVerified from './pages/EmailVerified'
import PaymentSuccess from './pages/PaymentSuccess'
import SkuVaultConnection from './pages/SkuVaultConnection'
import AdminSync from './pages/AdminSync'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AuthProvider>
      <MembershipProvider>
        <Routes>
          <Route path="/" element={<LandingPageAB />} />
          <Route path="/ab" element={<LandingPage />} />
          <Route path="/demo" element={<Demo />} />
          <Route path="/demo/dashboard" element={<DemoDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/test-contact" element={<TestContact />} />
          <Route path="/support" element={<Support />} />
          <Route path="/status" element={<Status />} />
          <Route path="/about" element={<About />} />
          <Route path="/email-verification" element={<EmailVerification />} />
          <Route path="/email-verified" element={<EmailVerified />} />
          <Route path="/invitation/:token" element={<InvitationAccept />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/app/*"
            element={
              <Routes>
                {/* Unprotected signup flow pages */}
                <Route path="/account-setup" element={<AccountSetup />} />
                <Route path="/contract-review" element={<ContractReview />} />
                <Route path="/skuvault-connection" element={<SkuVaultConnection />} />
                
                {/* Protected pages */}
                <Route
                  path="*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<DefaultRoute />} />
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/inventory" element={<Inventory />} />
                          <Route path="/aging-inventory" element={<AgingInventoryReport />} />
                          <Route path="/profitability" element={<ProfitabilityReport />} />
                          <Route path="/demand-forecast" element={<DemandForecast />} />
                          <Route path="/financial-warehouse" element={<FinancialWarehouseReport />} />
                          <Route path="/locations" element={<Locations />} />
                          <Route path="/performance" element={<Performance />} />
                          <Route path="/picker-analytics" element={<PickerAnalytics />} />
                          <Route path="/channel-performance" element={<ChannelPerformance />} />
                          <Route path="/inventory-turnover" element={<InventoryTurnoverReport />} />
                          <Route path="/low-stock" element={<LowStockReport />} />
                          <Route path="/low-stock-admin" element={<LowStockAdmin />} />
                          <Route path="/admin" element={<AdminDashboard />} />
                          <Route path="/admin/customers" element={<CustomerManagement />} />
                          <Route path="/admin/tiers" element={<TierConfigPage />} />
                          <Route path="/admin/users" element={<UserManagement />} />
                          <Route path="/admin/sync" element={<AdminSync />} />
                          <Route path="/membership/upgrade" element={<MembershipUpgrade />} />
                          <Route path="/account-settings" element={<AccountSettings />} />
                          <Route path="/user-management" element={<UserManagement />} />
                          <Route path="/stripe-setup" element={<StripeSetup />} />
                          <Route path="/payment-success" element={<PaymentSuccess />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            }
          />
          {/* Catch-all route for public pages */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MembershipProvider>
    </AuthProvider>
  )
}

export default App