import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Menu, User, LogOut, Wallet, MessageSquare, Clock, HelpCircle, Star } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

// Component to display balance (simplified - no frozen)
function HeaderBalanceDisplay({ userId, balance, isMobile = false }: { userId: string; balance: number; isMobile?: boolean }) {
  // Check webhook status (active activations)
  const { data: activeCount = 0 } = useQuery<number>({
    queryKey: ['active-activations', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('activations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['pending', 'waiting']);
      
      return data?.length || 0;
    },
    enabled: !!userId,
    refetchInterval: 3000,
  });

  if (isMobile) {
    return (
      <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl mb-3">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-gray-600">Solde</span>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 bg-green-100 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 font-medium">Active</span>
            </div>
          )}
          <span className="text-lg font-bold text-blue-600">{Math.floor(balance)} Ⓐ</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg">
      {activeCount > 0 && (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-600">Listening</span>
          </div>
          <div className="h-4 w-px bg-gray-300"></div>
        </>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-600">Balance:</span>
        <span className="font-bold text-blue-600">{Math.floor(balance)} Ⓐ</span>
      </div>
    </div>
  );
}

export default function Header() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { user, signOut } = useAuthStore()

  // Fetch user balance
  const { data: userData } = useQuery<{ balance: number } | null>({
    queryKey: ['user-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('balance')
        .eq('id', user.id)
        .single();
      return data as { balance: number } | null;
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Refresh every 10s
  });

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  // Determine logo destination based on auth state
  const logoDestination = user ? '/dashboard' : '/';

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to={logoDestination} className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg">
              OS
            </div>
            <span className="text-2xl font-bold text-gray-900">{t('app.name')}</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {user && user.role !== 'admin' ? (
              <>
                <Link to="/top-up">
                  <Button variant="ghost" className="font-medium">{t('nav.topUp')}</Button>
                </Link>
                <Link to="/settings">
                  <Button variant="ghost" className="font-medium">{t('nav.account')}</Button>
                </Link>
                <Link to="/history">
                  <Button variant="ghost" className="font-medium">{t('nav.history')}</Button>
                </Link>
                <Link to="/how-to-use">
                  <Button variant="ghost" className="font-medium">{t('nav.howToUse')}</Button>
                </Link>
                <a href="#contacts">
                  <Button variant="ghost" className="font-medium">{t('nav.contacts')}</Button>
                </a>
              </>
            ) : !user && (
              <>
                <Link to="/catalog">
                  <Button variant="ghost" className="font-medium">{t('nav.services')}</Button>
                </Link>
                <a href="#features">
                  <Button variant="ghost" className="font-medium">{t('nav.features')}</Button>
                </a>
                <a href="#pricing">
                  <Button variant="ghost" className="font-medium">{t('nav.pricing')}</Button>
                </a>
              </>
            )}
          </nav>

          {/* Right Section */}
          <div className="flex items-center space-x-3">
            {/* User Balance & Info */}
            {user && userData && (
              <HeaderBalanceDisplay userId={user.id} balance={userData.balance || 0} />
            )}

            {/* Language Selector - Amélioré */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 rounded-xl transition-all duration-200 border border-gray-200 hover:border-blue-300 group"
              title={i18n.language === 'en' ? 'Switch to French' : 'Passer en anglais'}
            >
              <span className="text-xl group-hover:scale-110 transition-transform">{i18n.language === 'en' ? '🇬🇧' : '🇫🇷'}</span>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600">{i18n.language === 'en' ? 'EN' : 'FR'}</span>
              <svg className="w-3 h-3 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {user ? (
              <div className="flex items-center space-x-2">
                <Link to="/settings">
                  <Button variant="ghost" size="icon" className="hidden md:flex">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={signOut}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost">{t('nav.login')}</Button>
                </Link>
                <Link to="/register">
                  <Button className="bg-blue-600 hover:bg-blue-700">{t('nav.register')}</Button>
                </Link>
              </>
            )}

            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Mobile Menu - Complet avec toutes les options */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t bg-white">
            {/* Balance mobile */}
            {user && userData && (
              <HeaderBalanceDisplay userId={user.id} balance={userData.balance || 0} isMobile={true} />
            )}
            
            <nav className="flex flex-col space-y-1">
              {user && user.role !== 'admin' ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-blue-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-700">{t('nav.dashboard', 'Dashboard')}</span>
                  </Link>
                  <Link 
                    to="/top-up" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-green-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-medium text-gray-700">{t('nav.topUp')}</span>
                  </Link>
                  <Link 
                    to="/settings" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-purple-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="font-medium text-gray-700">{t('nav.account')}</span>
                  </Link>
                  <Link 
                    to="/history" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-orange-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <span className="font-medium text-gray-700">{t('nav.history')}</span>
                  </Link>
                  <Link 
                    to="/how-to-use" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-cyan-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-10 h-10 bg-cyan-100 rounded-xl flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-cyan-600" />
                    </div>
                    <span className="font-medium text-gray-700">{t('nav.howToUse')}</span>
                  </Link>
                  
                  {/* Divider */}
                  <div className="h-px bg-gray-200 my-2 mx-4"></div>
                  
                  {/* Logout Button */}
                  <button 
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-red-50 transition-colors text-red-600 w-full"
                  >
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <LogOut className="w-5 h-5 text-red-600" />
                    </div>
                    <span className="font-medium">{t('nav.logout', 'Déconnexion')}</span>
                  </button>
                </>
              ) : !user && (
                <>
                  <Link 
                    to="/catalog" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-blue-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-700">{t('nav.services')}</span>
                  </Link>
                  <a 
                    href="#features" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-purple-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Star className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="font-medium text-gray-700">{t('nav.features')}</span>
                  </a>
                  <a 
                    href="#pricing" 
                    className="flex items-center gap-3 py-3 px-4 rounded-xl hover:bg-green-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="font-medium text-gray-700">{t('nav.pricing')}</span>
                  </a>
                  
                  {/* Divider */}
                  <div className="h-px bg-gray-200 my-2 mx-4"></div>
                  
                  {/* Auth Buttons */}
                  <div className="px-4 space-y-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full h-12 font-medium">
                        {t('nav.login')}
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-medium">
                        {t('nav.register')}
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
