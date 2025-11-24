import { Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Header from './Header'
import Footer from './Footer'

export default function Layout() {
  const location = useLocation()
  const { user } = useAuthStore()
  
  // Afficher le footer uniquement sur la page d'accueil ET si l'utilisateur n'est PAS connecté
  const showFooter = location.pathname === '/' && !user
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </div>
  )
}
