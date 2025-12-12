import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { Toaster } from '@/components/ui/toaster'
import Layout from '@/components/layout/Layout'

// Public pages - loaded immediately
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import VerifyEmailPage from '@/pages/VerifyEmailPage'
import HowToUsePage from '@/pages/HowToUsePage'
import SupportPage from '@/pages/SupportPage'
import TermsPage from '@/pages/TermsPage'
import PrivacyPage from '@/pages/PrivacyPage'
import ContactPage from '@/pages/ContactPage'
import UnsubscribePage from '@/pages/UnsubscribePage'
import PrivateRoute from '@/components/PrivateRoute'
import AdminRoute from '@/components/AdminRoute'

// Protected pages - lazy loaded
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const CatalogPage = lazy(() => import('@/pages/CatalogPage'))
const MyNumbersPage = lazy(() => import('@/pages/MyNumbersPage'))
const HistoryPage = lazy(() => import('@/pages/HistoryPage'))
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ReferralPage = lazy(() => import('@/pages/ReferralPage'))
const TopUpPage = lazy(() => import('@/pages/TopUpPage'))
const RentPage = lazy(() => import('@/pages/RentPage'))
const WavePaymentProof = lazy(() => import('@/pages/WavePaymentProof'))

// Admin pages - lazy loaded
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminMonitoring = lazy(() => import('@/pages/admin/AdminMonitoring'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminProviders = lazy(() => import('@/pages/admin/AdminProviders'))
const AdminServices = lazy(() => import('@/pages/admin/AdminServices'))
const AdminCountries = lazy(() => import('@/pages/admin/AdminCountries'))
const AdminTransactions = lazy(() => import('@/pages/admin/AdminTransactions'))
const AdminPricing = lazy(() => import('@/pages/admin/AdminPricing'))
const AdminAnalytics = lazy(() => import('@/pages/admin/AdminAnalytics'))
const AdminLogs = lazy(() => import('@/pages/admin/AdminLogs'))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'))
const AdminSyncStatusPage = lazy(() => import('@/pages/admin/AdminSyncStatusPage'))
const PackagesManagementPage = lazy(() => import('@/pages/admin/PackagesManagementPage'))
const AdminContactSettings = lazy(() => import('@/pages/admin/AdminContactSettings'))
const AdminContactMessages = lazy(() => import('@/pages/admin/AdminContactMessages'))
const AdminActivations = lazy(() => import('@/pages/admin/AdminActivations'))
const AdminRentals = lazy(() => import('@/pages/admin/AdminRentals'))
const AdminReferrals = lazy(() => import('@/pages/admin/AdminReferrals'))
const AdminEmails = lazy(() => import('@/pages/admin/AdminEmails'))
const AdminPromoCodes = lazy(() => import('@/pages/admin/AdminPromoCodes'))
const AdminPaymentProviders = lazy(() => import('@/pages/admin/AdminPaymentProviders'))
const AdminWavePayments = lazy(() => import('@/pages/admin/AdminWavePayments'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
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
              <Route path="unsubscribe" element={<UnsubscribePage />} />
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
                <Route path="wave-proof" element={<WavePaymentProof />} />
                <Route path="top-up" element={<TopUpPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="referral" element={<ReferralPage />} />
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
              <Route path="contact-messages" element={<AdminContactMessages />} />
              <Route path="referrals" element={<AdminReferrals />} />
              <Route path="emails" element={<AdminEmails />} />
              <Route path="wave-payments" element={<AdminWavePayments />} />
              <Route path="promo-codes" element={<AdminPromoCodes />} />
              <Route path="payment-providers" element={<AdminPaymentProviders />} />
            </Route>
          </Routes>
        </Suspense>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App
