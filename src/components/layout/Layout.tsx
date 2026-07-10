import { Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useFeatures } from '@/hooks/useFeatures'
import Header from './Header'
import Footer from './Footer'
import MobileBottomNav from './MobileBottomNav'
import MaintenancePage from '@/pages/MaintenancePage'
import { FloatingSupportButton } from '@/components/support/FloatingSupportButton'
import { TutorialModal } from '@/components/TutorialModal'
import { GlobalPopup } from '@/components/layout/GlobalPopup'
import { motion, AnimatePresence } from 'framer-motion'


export default function Layout() {
  const location = useLocation()
  const { user } = useAuthStore()
  const { isMaintenanceMode } = useFeatures()

  // 🛡️ MAINTENANCE MODE GUARD
  const isAdmin = user?.role === 'admin'
  const isLoginPage = location.pathname === '/login' || location.pathname === '/admin'
  const isDev = import.meta.env.DEV

  // If maintenance is on, block access to everything except Login and Admin
  // BYPASS: Always allow access in DEV mode (Localhost)
  if (isMaintenanceMode && !isAdmin && !isLoginPage && !isDev) {
    return <MaintenancePage />
  }

  // Afficher le footer uniquement sur la page d'accueil ET si l'utilisateur n'est PAS connecté
  const showFooter = location.pathname === '/' && !user

  const publicPaths = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/about',
    '/how-to-use',
    '/support',
    '/contact',
    '/unsubscribe',
    '/terms',
    '/privacy',
  ]

  const isPublicPage = publicPaths.includes(location.pathname)

  // Show MobileNav only if user is logged in AND not on a public page
  const showMobileNav = user && !isPublicPage

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex-1 pb-20 md:pb-0"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      {showFooter && <Footer />}
      {showMobileNav && <MobileBottomNav />}
      <FloatingSupportButton />
      <TutorialModal />
      <GlobalPopup />
    </div>
  )
}
