import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { LogOut, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { user, signOut } = useAuthStore()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  const menuItems = [
    { path: '/admin', label: t('admin.dashboard') },
    { path: '/admin/users', label: t('admin.users') },
    { path: '/admin/providers', label: t('admin.providers') },
    { path: '/admin/services', label: t('admin.services') },
    { path: '/admin/countries', label: t('admin.countries') },
    { path: '/admin/transactions', label: t('admin.transactions') },
    { path: '/admin/pricing', label: t('admin.pricing') },
    { path: '/admin/packages', label: 'Packages' },
    { path: '/admin/analytics', label: t('admin.analytics') },
    { path: '/admin/logs', label: t('admin.logs') },
    { path: '/admin/settings', label: t('admin.settings') },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Admin Header - Séparé du header utilisateur */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold">
                A
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-500">One SMS Administration</p>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleLanguage}
                className="text-sm text-gray-600 hover:text-primary"
              >
                {i18n.language.toUpperCase()}
              </button>

              {user && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{user.email}</span>
                  <Button variant="ghost" size="icon" onClick={signOut}>
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r">
          <nav className="p-4">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-2 rounded-lg mb-1 ${
                  location.pathname === item.path
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
