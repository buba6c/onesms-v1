import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Menu, User, LogOut, Wallet, MessageSquare, Clock, HelpCircle, Star, X, Sparkles, ChevronRight, Home, Shield, Globe, Zap, ArrowRight } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-4 shadow-lg">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white"></div>
          <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white"></div>
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Votre solde</p>
              <p className="text-2xl font-bold text-white">{Math.floor(balance)} Ⓐ</p>
            </div>
          </div>
          
          {activeCount > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 backdrop-blur-sm">
              <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400 shadow-lg shadow-green-400/50"></div>
              <span className="text-sm font-semibold text-white">{activeCount} active</span>
            </div>
          )}
        </div>
        
        <Link 
          to="/top-up" 
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-50 active:scale-[0.98]"
        >
          <Zap className="h-4 w-4" />
          Recharger
          <ArrowRight className="h-4 w-4" />
        </Link>
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
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, signOut } = useAuthStore()

  // Detect if we're on homepage
  const isHomePage = location.pathname === '/'

  // Handle scroll effect for transparent header
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const closeMenu = useCallback(() => setMobileMenuOpen(false), [])

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

  // Dynamic styling
  const isTransparent = isHomePage && !scrolled && !user;
  const headerClasses = isTransparent
    ? 'fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-white/10 transition-all duration-300'
    : 'border-b bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm transition-all duration-300';
  const textColorClass = isTransparent ? 'text-white' : 'text-gray-900';

  return (
    <>
    <header className={headerClasses}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to={logoDestination} className="flex items-center space-x-2 group">
            <img 
              src="/logo.png" 
              alt="One SMS" 
              className="h-9 md:h-10 w-auto transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {user && user.role !== 'admin' ? (
              <>
                <Link to="/top-up">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.topUp')}</Button>
                </Link>
                <Link to="/settings">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.account')}</Button>
                </Link>
                <Link to="/history">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.history')}</Button>
                </Link>
                <Link to="/how-to-use">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.howToUse')}</Button>
                </Link>
              </>
            ) : !user && (
              <>
                <a href="#features">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.features')}</Button>
                </a>
                <a href="#pricing">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.pricing')}</Button>
                </a>
                <Link to="/catalog">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.services')}</Button>
                </Link>
              </>
            )}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* User Balance - Desktop only */}
            {user && userData && (
              <HeaderBalanceDisplay userId={user.id} balance={userData.balance || 0} />
            )}

            {/* Language Selector */}
            <button
              onClick={toggleLanguage}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all duration-200 ${
                isTransparent
                  ? 'bg-white/10 hover:bg-white/20 border border-white/20'
                  : 'hover:bg-gray-100 border border-gray-200'
              }`}
              title={i18n.language === 'en' ? 'Switch to French' : 'Passer en anglais'}
            >
              <span className="text-lg">{i18n.language === 'en' ? '🇬🇧' : '🇫🇷'}</span>
              <span className={`text-xs font-semibold hidden sm:inline ${
                isTransparent ? 'text-white' : 'text-gray-700'
              }`}>{i18n.language === 'en' ? 'EN' : 'FR'}</span>
            </button>

            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/settings">
                  <Button variant="ghost" size="icon" className={isTransparent ? 'text-white hover:bg-white/10' : ''}>
                    <User className="h-5 w-5" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={signOut} className={isTransparent ? 'text-white hover:bg-white/10' : ''}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" className={`font-medium ${isTransparent ? 'text-white hover:bg-white/10' : ''}`}>
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button className={`font-semibold shadow-lg transition-all hover:scale-105 ${
                    isTransparent
                      ? 'bg-white text-blue-600 hover:bg-gray-100'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white'
                  }`}>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    {t('nav.register')}
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              className={`md:hidden relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 ${
                isTransparent
                  ? 'text-white hover:bg-white/10'
                  : 'text-gray-700 hover:bg-gray-100'
              } ${mobileMenuOpen ? 'bg-gray-100' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            >
              <div className="relative h-5 w-5">
                <span className={`absolute left-0 block h-0.5 w-5 transform transition-all duration-300 ${
                  isTransparent && !mobileMenuOpen ? 'bg-white' : 'bg-gray-700'
                } ${mobileMenuOpen ? 'top-2 rotate-45' : 'top-0.5'}`}></span>
                <span className={`absolute left-0 top-2 block h-0.5 w-5 transition-all duration-300 ${
                  isTransparent && !mobileMenuOpen ? 'bg-white' : 'bg-gray-700'
                } ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                <span className={`absolute left-0 block h-0.5 w-5 transform transition-all duration-300 ${
                  isTransparent && !mobileMenuOpen ? 'bg-white' : 'bg-gray-700'
                } ${mobileMenuOpen ? 'top-2 -rotate-45' : 'top-[14px]'}`}></span>
              </div>
            </button>
          </div>
        </div>
      </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      />

      {/* Mobile Menu Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 font-bold text-white shadow-lg">
              OS
            </div>
            <span className="text-lg font-bold text-gray-900">{t('app.name')}</span>
          </div>
          <button
            onClick={closeMenu}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="Fermer le menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="flex h-[calc(100%-73px)] flex-col overflow-y-auto">
          {/* Balance Card for logged-in users */}
          {user && userData && (
            <div className="p-5">
              <HeaderBalanceDisplay userId={user.id} balance={userData.balance || 0} isMobile={true} />
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex-1 px-5 py-2">
            {user && user.role !== 'admin' ? (
              <div className="space-y-1">
                <Link 
                  to="/dashboard" 
                  className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                    location.pathname === '/dashboard' ? 'bg-blue-100 border-2 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={closeMenu}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 shadow-sm">
                    <Home className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className={`font-medium ${location.pathname === '/dashboard' ? 'text-blue-700' : 'text-gray-800'}`}>
                    {t('nav.dashboard', 'Dashboard')}
                  </span>
                  <ChevronRight className={`h-5 w-5 ml-auto ${location.pathname === '/dashboard' ? 'text-blue-400' : 'text-gray-300'}`} />
                </Link>
                
                <Link 
                  to="/top-up" 
                  className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                    location.pathname === '/top-up' ? 'bg-green-100 border-2 border-green-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={closeMenu}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 shadow-sm">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <span className={`font-medium ${location.pathname === '/top-up' ? 'text-green-700' : 'text-gray-800'}`}>
                    {t('nav.topUp')}
                  </span>
                  <ChevronRight className={`h-5 w-5 ml-auto ${location.pathname === '/top-up' ? 'text-green-400' : 'text-gray-300'}`} />
                </Link>
                
                <Link 
                  to="/settings" 
                  className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                    location.pathname === '/settings' ? 'bg-purple-100 border-2 border-purple-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={closeMenu}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 shadow-sm">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className={`font-medium ${location.pathname === '/settings' ? 'text-purple-700' : 'text-gray-800'}`}>
                    {t('nav.account')}
                  </span>
                  <ChevronRight className={`h-5 w-5 ml-auto ${location.pathname === '/settings' ? 'text-purple-400' : 'text-gray-300'}`} />
                </Link>
                
                <Link 
                  to="/history" 
                  className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                    location.pathname === '/history' ? 'bg-orange-100 border-2 border-orange-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={closeMenu}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 shadow-sm">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <span className={`font-medium ${location.pathname === '/history' ? 'text-orange-700' : 'text-gray-800'}`}>
                    {t('nav.history')}
                  </span>
                  <ChevronRight className={`h-5 w-5 ml-auto ${location.pathname === '/history' ? 'text-orange-400' : 'text-gray-300'}`} />
                </Link>
                
                <Link 
                  to="/how-to-use" 
                  className={`flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200 active:scale-[0.98] ${
                    location.pathname === '/how-to-use' ? 'bg-cyan-100 border-2 border-cyan-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={closeMenu}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-100 shadow-sm">
                    <HelpCircle className="h-5 w-5 text-cyan-600" />
                  </div>
                  <span className={`font-medium ${location.pathname === '/how-to-use' ? 'text-cyan-700' : 'text-gray-800'}`}>
                    {t('nav.howToUse')}
                  </span>
                  <ChevronRight className={`h-5 w-5 ml-auto ${location.pathname === '/how-to-use' ? 'text-cyan-400' : 'text-gray-300'}`} />
                </Link>

                {/* Divider */}
                <div className="my-4 h-px bg-gray-100"></div>

                {/* Logout */}
                <button
                  onClick={() => {
                    signOut();
                    closeMenu();
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 text-red-600 transition-all duration-200 hover:bg-red-50 active:scale-[0.98]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 shadow-sm">
                    <LogOut className="h-5 w-5 text-red-600" />
                  </div>
                  <span className="font-medium">{t('nav.logout', 'Déconnexion')}</span>
                </button>
              </div>
            ) : !user && (
              <div className="space-y-1">
                <Link 
                  to="/catalog" 
                  className="flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200 hover:bg-gray-50 active:scale-[0.98]"
                  onClick={closeMenu}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 shadow-sm">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-800">{t('nav.services')}</span>
                  <ChevronRight className="h-5 w-5 ml-auto text-gray-300" />
                </Link>
                
                <a 
                  href="#features" 
                  className="flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200 hover:bg-gray-50 active:scale-[0.98]"
                  onClick={closeMenu}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 shadow-sm">
                    <Star className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="font-medium text-gray-800">{t('nav.features')}</span>
                  <ChevronRight className="h-5 w-5 ml-auto text-gray-300" />
                </a>
                
                <a 
                  href="#pricing" 
                  className="flex items-center gap-4 py-3.5 px-4 rounded-2xl transition-all duration-200 hover:bg-gray-50 active:scale-[0.98]"
                  onClick={closeMenu}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 shadow-sm">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <span className="font-medium text-gray-800">{t('nav.pricing')}</span>
                  <ChevronRight className="h-5 w-5 ml-auto text-gray-300" />
                </a>

                {/* Divider */}
                <div className="my-4 h-px bg-gray-100"></div>

                {/* Language Switch */}
                <button
                  onClick={toggleLanguage}
                  className="flex w-full items-center gap-4 rounded-2xl px-4 py-3.5 transition-all duration-200 hover:bg-gray-50 active:scale-[0.98]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 shadow-sm">
                    <Globe className="h-5 w-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-800">
                    {i18n.language === 'en' ? 'Français' : 'English'}
                  </span>
                  <span className="text-2xl ml-auto">{i18n.language === 'en' ? '🇫🇷' : '🇬🇧'}</span>
                </button>
              </div>
            )}
          </nav>

          {/* Bottom Auth Buttons for non-logged users */}
          {!user && (
            <div className="border-t border-gray-100 p-5">
              <div className="space-y-3">
                <Link to="/login" onClick={closeMenu} className="block">
                  <Button 
                    variant="outline" 
                    className="h-12 w-full rounded-xl text-base font-medium"
                  >
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/register" onClick={closeMenu} className="block">
                  <Button 
                    className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-base font-semibold shadow-lg hover:from-blue-700 hover:to-cyan-600"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {t('nav.register')}
                  </Button>
                </Link>
              </div>
              
              {/* Trust badges */}
              <div className="mt-6 flex items-center justify-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" />
                  Sécurisé
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  Instant
                </span>
                <span>•</span>
                <span>24/7</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
