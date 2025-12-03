import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/layout/Layout'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage'
import DashboardPage from '@/pages/DashboardPage'
import CatalogPage from '@/pages/CatalogPage'
import MyNumbersPage from '@/pages/MyNumbersPage'
import HistoryPage from '@/pages/HistoryPage'
import TransactionsPage from '@/pages/TransactionsPage'
import SettingsPage from '@/pages/SettingsPage'
import TopUpPage from '@/pages/TopUpPage'
import RentPage from '@/pages/RentPage'
import HowToUsePage from '@/pages/HowToUsePage'
import SupportPage from '@/pages/SupportPage'
import TermsPage from '@/pages/TermsPage'
import PrivacyPage from '@/pages/PrivacyPage'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AdminMonitoring from '@/pages/admin/AdminMonitoring'
import AdminUsers from '@/pages/admin/AdminUsers'
import AdminProviders from '@/pages/admin/AdminProviders'
import AdminServices from '@/pages/admin/AdminServices'
import AdminCountries from '@/pages/admin/AdminCountries'
import AdminTransactions from '@/pages/admin/AdminTransactions'
import AdminPricing from '@/pages/admin/AdminPricing'
import AdminAnalytics from '@/pages/admin/AdminAnalytics'
import AdminLogs from '@/pages/admin/AdminLogs'
import AdminSettings from '@/pages/admin/AdminSettings'
import AdminSyncStatusPage from '@/pages/admin/AdminSyncStatusPage'
import PackagesManagementPage from '@/pages/admin/PackagesManagementPage'
import AdminContactSettings from '@/pages/admin/AdminContactSettings'
import AdminActivations from '@/pages/admin/AdminActivations'
import AdminRentals from '@/pages/admin/AdminRentals'
import ContactPage from '@/pages/ContactPage'
import PrivateRoute from '@/components/PrivateRoute'
import AdminRoute from '@/components/AdminRoute'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="verify-email" element={<VerifyEmailPage />} />
            <Route path="how-to-use" element={<HowToUsePage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="terms" element={<TermsPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            
            {/* Protected Routes - Main Dashboard becomes home after login */}
            <Route element={<PrivateRoute />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="rent" element={<RentPage />} />
              <Route path="catalog" element={<CatalogPage />} />
              <Route path="my-numbers" element={<MyNumbersPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="top-up" element={<TopUpPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Admin Routes - SANS Layout principal (AdminLayout inclus dans AdminRoute) */}
          <Route path="admin" element={<AdminRoute />}>
            <Route index element={<AdminDashboard />} />
            <Route path="monitoring" element={<AdminMonitoring />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="providers" element={<AdminProviders />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="countries" element={<AdminCountries />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="activations" element={<AdminActivations />} />
            <Route path="rentals" element={<AdminRentals />} />
            <Route path="pricing" element={<AdminPricing />} />
            <Route path="packages" element={<PackagesManagementPage />} />
            <Route path="sync-status" element={<AdminSyncStatusPage />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="contact-settings" element={<AdminContactSettings />} />
          </Route>
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
