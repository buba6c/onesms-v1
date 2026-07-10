import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { 
  LogOut, LayoutDashboard, BarChart3, CreditCard, DollarSign, Building, 
  Waves, Box, Server, Phone, Clock, Package, Tag, Users, UserPlus, 
  MessageSquare, Bot, Activity, RefreshCw, FileText, Globe, Settings, 
  Mail, MailOpen, BoxSelect, Code, Bell
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { GlobalPopup } from '@/components/layout/GlobalPopup'
import SecurityAlertBanner from '@/components/admin/SecurityAlertBanner'

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      navigate('/login')
    }
  }

  const menuSections = [
    {
      title: 'MAIN MENU',
      items: [
        { path: '/admin', label: t('admin.dashboard', 'Dashboard'), icon: LayoutDashboard },
        { path: '/admin/analytics', label: t('admin.analytics', 'Analytics'), icon: BarChart3 },
        { path: '/admin/users', label: t('admin.users', 'Users'), icon: Users },
      ]
    },
    {
      title: 'FINANCES',
      items: [
        { path: '/admin/transactions', label: t('admin.transactions', 'Transactions'), icon: CreditCard },
        { path: '/admin/pricing', label: t('admin.pricing', 'Pricing'), icon: DollarSign },
        { path: '/admin/payment-providers', label: t('admin.paymentProviders', 'Payment Providers'), icon: Building },
        { path: '/admin/wave-payments', label: 'Wave Payments', icon: Waves },
      ]
    },
    {
      title: 'SERVICES & PRODUCTS',
      items: [
        { path: '/admin/activations', label: t('admin.activations', 'Activations'), icon: Phone },
        { path: '/admin/rentals', label: t('admin.rentals', 'Rentals'), icon: Clock },
        { path: '/admin/services', label: t('admin.services', 'Services'), icon: Box },
        { path: '/admin/providers', label: t('admin.providers', 'Providers'), icon: Server },
        { path: '/admin/packages', label: t('admin.packages', 'Packages'), icon: Package },
        { path: '/admin/promo-codes', label: t('admin.promoCodes', 'Promo Codes'), icon: Tag },
        { path: '/admin/api-manager', label: 'API Manager', icon: Code },
      ]
    },
    {
      title: 'ENGAGEMENT',
      items: [
        { path: '/admin/referrals', label: t('admin.referrals', 'Referrals'), icon: UserPlus },
        { path: '/admin/contact-messages', label: t('admin.contactMessages', 'Messages'), icon: MessageSquare },
        { path: '/admin/support', label: 'Support & IA', icon: Bot },
      ]
    },
    {
      title: 'SYSTEM & SETTINGS',
      items: [
        { path: '/admin/monitoring', label: t('admin.monitoring', 'Monitoring'), icon: Activity },
        { path: '/admin/sync-status', label: t('admin.syncStatus', 'Sync Status'), icon: RefreshCw },
        { path: '/admin/logs', label: t('admin.logs', 'Logs'), icon: FileText },
        { path: '/admin/announcements', label: 'Popups & Alerts', icon: Bell },
        { path: '/admin/countries', label: t('admin.countries', 'Countries'), icon: Globe },
        { path: '/admin/settings', label: t('admin.settings', 'Settings'), icon: Settings },
        { path: '/admin/contact-settings', label: t('contact.title', 'Contact Settings'), icon: Mail },
        { path: '/admin/emails', label: t('admin.emails', 'Emails'), icon: MailOpen },
      ]
    }
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F8]">
      {/* Top Header - Kept clean and minimal */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="px-6 py-3 flex items-center justify-end border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleLanguage}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors bg-gray-100 px-3 py-1.5 rounded-full"
            >
              {i18n.language.toUpperCase()}
            </button>
            {user && (
              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <span className="text-sm font-medium text-gray-700">{user.email}</span>
                <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full text-gray-500 hover:text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar matching Veritas design */}
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-[calc(100vh-53px)] sticky top-[53px] overflow-y-auto hidden md:flex shrink-0 custom-scrollbar">
          {/* Logo Area */}
          <div className="px-4 py-8 flex justify-start">
            <img src="/logo.png" alt="ONE SMS Logo" className="w-48 md:w-56 h-auto object-contain" />
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 pb-8 space-y-8">
            {menuSections.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h4 className="px-4 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  {section.title}
                </h4>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location.pathname === item.path
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200",
                          isActive 
                            ? "bg-gray-100 text-gray-900 shadow-sm" 
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      >
                        <Icon className={cn("w-[18px] h-[18px]", isActive ? "text-cyan-500" : "text-gray-400")} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto">
            <SecurityAlertBanner />
            {children}
          </div>
        </main>
      </div>
      
      {/* Custom scrollbar styles for sidebar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #f3f4f6;
          border-radius: 10px;
        }
      `}</style>
      <GlobalPopup />
    </div>
  )
}
