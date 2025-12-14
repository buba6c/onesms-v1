import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { User, LogOut, Wallet, Clock, HelpCircle, X, Sparkles, ChevronRight, Home, Shield, Globe, Zap, ArrowRight, DollarSign, FileText, Gift } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance'

// Hook to get branding settings (logo, colors)
function useBrandingSettings() {
  return useQuery({
    queryKey: ['branding-settings'],
    queryFn: async () => {
      try {
        const { data } = await (supabase as any)
          .from('system_settings')
          .select('key, value')
          .in('key', ['app_logo_url', 'app_favicon_url', 'app_primary_color', 'app_secondary_color', 'app_name']);
        
        const settings: Record<string, string> = {};
        (data as { key: string; value: string }[] | null)?.forEach(s => { 
          // Ignorer les valeurs vides ou null
          if (s.value && s.value.trim() !== '') {
            settings[s.key] = s.value; 
          }
        });
        return settings;
      } catch {
        return {};
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

// Component to display balance with frozen credits
// TERMINOLOGIE UNIFIÉE: solde = balance totale, frozen = gelé
function HeaderBalanceDisplay({ userId, solde, frozen = 0, isMobile = false, onRechargeClick }: { 
  userId: string; 
  solde: number;      // Balance totale du compte
  frozen?: number;    // Montant gelé pour achats en cours
  isMobile?: boolean; 
  onRechargeClick?: () => void 
}) {
  const { t } = useTranslation();
  
  // 🔴 REALTIME: Écoute les activations en temps réel
  useRealtimeSubscription({
    table: 'activations',
    filter: `user_id=eq.${userId}`,
    enabled: !!userId,
    queryKeys: [['active-activations', userId]],
  });
  
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
    // Polling désactivé - realtime activé
    refetchInterval: false,
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
              <p className="text-sm font-medium text-white/80">💰 {t('dashboard.balance')}</p>
              <p className="text-2xl font-bold text-white">{Math.floor(solde - frozen)} Ⓐ</p>
              {frozen > 0 && (
                <p className="text-xs text-white/70 mt-0.5">
                  🔒 {Math.floor(frozen)} Ⓐ gelé • Total: {Math.floor(solde)} Ⓐ
                </p>
              )}
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
          onClick={(e) => {
            // S'assurer que le menu se ferme après le clic
            if (onRechargeClick) {
              setTimeout(() => onRechargeClick(), 10);
            }
          }}
          className="relative z-10 mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-50 active:scale-[0.98]"
        >
          <Zap className="h-4 w-4" />
          {t('nav.topUp')}
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
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-600">{t('dashboard.balance')}:</span>
          <span className="font-bold text-blue-600">{Math.floor(solde - frozen)} Ⓐ</span>
        </div>
        {frozen > 0 && (
          <>
            <div className="h-4 w-px bg-gray-300"></div>
            <span className="text-xs text-orange-500" title={`Total: ${Math.floor(solde)} Ⓐ`}>
              🔒 {Math.floor(frozen)} gelé
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function Header() {
  const { t, i18n } = useTranslation()
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

  // 🔴 REALTIME: Hook dédié pour la balance en temps réel
  // balance = balance totale du compte (affiché)
  // frozen = montant gelé (transactions en cours)
  // disponible = balance - frozen (ce qu'on peut dépenser)
  const { balance, frozen } = useRealtimeBalance();

  // 🔴 REALTIME: Écoute les changements de la balance utilisateur en temps réel (backup query invalidation)
  const queryClient = useQueryClient();
  useRealtimeSubscription({
    table: 'users',
    filter: user?.id ? `id=eq.${user.id}` : undefined,
    enabled: !!user?.id,
    queryKeys: [['user-balance', user?.id]],
    onUpdate: () => {
      // Force refresh du store aussi
      queryClient.invalidateQueries({ queryKey: ['user-balance', user?.id] });
    }
  });

  // Fetch user balance (fallback, sera rafraîchi par realtime)
  const { data: userData, refetch: refetchBalance } = useQuery<{ balance: number; frozen_balance: number } | null>({
    queryKey: ['user-balance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('balance, frozen_balance')
        .eq('id', user.id)
        .single();
      return data as { balance: number; frozen_balance: number } | null;
    },
    enabled: !!user?.id,
    // Polling désactivé - utiliser realtime à la place
    refetchInterval: false,
    staleTime: 60000,
  });

  // TERMINOLOGIE UNIFIÉE:
  // - currentBalance = balance totale du compte (affiché en grand)
  // - currentFrozen = montant gelé (affiché en petit)
  // - disponible = currentBalance - currentFrozen (ce qu'on peut dépenser, calculé si besoin)
  const currentBalance = balance ?? (userData?.balance ?? 0);
  const currentFrozen = frozen ?? (userData?.frozen_balance ?? 0);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en'
    i18n.changeLanguage(newLang)
    localStorage.setItem('language', newLang)
  }

  // Get branding settings (logo, colors)
  const { data: branding } = useBrandingSettings();
  // Logo par défaut: 4w pour header blanc (après scroll), 4s pour header transparent
  const defaultLogoLight = '/logos/One SMS 4w png.png'; // Logo pour header blanc (après scroll)
  const defaultLogoDark = '/logos/One SMS 4s png.png';  // Logo pour header transparent (avant scroll)
  const appName = branding?.app_name || t('app.name');

  // Determine logo destination based on auth state
  const logoDestination = user ? '/dashboard' : '/';

  // Dynamic styling
  const isTransparent = isHomePage && !scrolled && !user;
  const headerClasses = isTransparent
    ? 'fixed top-0 left-0 right-0 z-50 bg-transparent border-b border-white/10 transition-all duration-300'
    : 'border-b bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-sm transition-all duration-300';
  const textColorClass = isTransparent ? 'text-white' : 'text-gray-900';
  
  // Logo dynamique selon le fond
  const currentLogoUrl = branding?.app_logo_url || (isTransparent ? defaultLogoDark : defaultLogoLight);

  return (
    <>
    <header className={headerClasses}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to={logoDestination} className="flex items-center group ml-4 md:ml-8">
            <img 
              src={currentLogoUrl} 
              alt="ONE SMS - Numéros virtuels pour vérification SMS"
              className="h-12 md:h-16 w-auto object-contain transition-all duration-300 group-hover:scale-105"
              onError={(e) => {
                // Fallback to OS text on error
                (e.target as HTMLImageElement).style.display = 'none';
                const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
            <div className={`hidden w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center text-white font-bold text-base md:text-lg shadow-lg transition-transform group-hover:scale-105 ${
              isTransparent 
                ? 'bg-white/20 backdrop-blur-sm border border-white/30' 
                : 'bg-gradient-to-br from-blue-600 to-cyan-500'
            }`}>
              <span className="text-white">OS</span>
            </div>
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
                <Link to="/referral">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.referral', 'Parrainage')}</Button>
                </Link>
                <Link to="/history">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.history')}</Button>
                </Link>
                <Link to="/how-to-use">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.howToUse')}</Button>
                </Link>
                <Link to="/support">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.support', 'Support')}</Button>
                </Link>
              </>
            ) : !user && (
              <>
                <a href="/#pricing">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>
                    {t('nav.pricing')}
                  </Button>
                </a>
                <Link to="/how-to-use">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>
                    {t('nav.howToUse')}
                  </Button>
                </Link>
                <Link to="/terms">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>
                    {t('footer.terms')}
                  </Button>
                </Link>
                <Link to="/privacy">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>
                    {t('footer.privacy')}
                  </Button>
                </Link>
                <Link to="/support">
                  <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>
                    {t('nav.support', 'Support')}
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* User Balance - Desktop only - Realtime */}
            {user && (
              <HeaderBalanceDisplay userId={user.id} solde={currentBalance} frozen={currentFrozen} />
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

      {/* Mobile Menu Overlay - Glassmorphism */}
      <div 
        className={`fixed inset-0 z-40 transition-all duration-500 md:hidden ${
          mobileMenuOpen 
            ? 'opacity-100 backdrop-blur-xl bg-gradient-to-br from-slate-900/90 via-blue-900/80 to-purple-900/90' 
            : 'opacity-0 pointer-events-none backdrop-blur-none'
        }`}
        onClick={closeMenu}
      />

      {/* Mobile Menu Panel - Modern Full Screen */}
      <div 
        className={`fixed inset-0 z-50 flex flex-col transition-all duration-500 ease-out md:hidden ${
          mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'
        }`}
      >
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 -left-20 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-40 -right-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        </div>

        {/* Menu Header */}
        <div className="relative flex items-center justify-end px-6 py-5 safe-area-top">
          <button
            onClick={closeMenu}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 hover:bg-white/20 hover:scale-105 active:scale-95"
            aria-label="Fermer le menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Menu Content */}
        <div className="relative flex-1 flex flex-col overflow-y-auto px-6 py-4">
          {/* Balance Card for logged-in users */}
          {user && (
            <div className="mb-8">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-xl border border-white/20 p-6">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                <HeaderBalanceDisplay userId={user.id} solde={currentBalance} frozen={currentFrozen} isMobile={true} onRechargeClick={closeMenu} />
              </div>
            </div>
          )}

          {/* Navigation Grid for Logged Users */}
          {user && user.role !== 'admin' ? (
            <>
              {/* Main Navigation */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Link 
                  to="/dashboard" 
                  className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 active:scale-95 ${
                    location.pathname === '/dashboard' 
                      ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/20 border-2 border-cyan-400/50' 
                      : 'bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20'
                  }`}
                  onClick={closeMenu}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-400/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                      <Home className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-semibold text-white text-sm">{t('nav.dashboard', 'Dashboard')}</span>
                  </div>
                </Link>

                <Link 
                  to="/top-up" 
                  className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 active:scale-95 ${
                    location.pathname === '/top-up' 
                      ? 'bg-gradient-to-br from-emerald-500/30 to-green-500/20 border-2 border-emerald-400/50' 
                      : 'bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20'
                  }`}
                  onClick={closeMenu}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-400/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                      <Wallet className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-semibold text-white text-sm">{t('nav.topUp')}</span>
                  </div>
                </Link>

                <Link 
                  to="/history" 
                  className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 active:scale-95 ${
                    location.pathname === '/history' 
                      ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/20 border-2 border-amber-400/50' 
                      : 'bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20'
                  }`}
                  onClick={closeMenu}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-semibold text-white text-sm">{t('nav.history')}</span>
                  </div>
                </Link>

                <Link 
                  to="/settings" 
                  className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 active:scale-95 ${
                    location.pathname === '/settings' 
                      ? 'bg-gradient-to-br from-violet-500/30 to-purple-500/20 border-2 border-violet-400/50' 
                      : 'bg-white/10 backdrop-blur-sm border border-white/10 hover:bg-white/15 hover:border-white/20'
                  }`}
                  onClick={closeMenu}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-violet-400/20 rounded-full blur-xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mb-3 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <span className="font-semibold text-white text-sm">{t('nav.account')}</span>
                  </div>
                </Link>
              </div>

              {/* Secondary Links */}
              <div className="space-y-2 mb-6">
                <Link 
                  to="/referral" 
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 active:scale-98"
                  onClick={closeMenu}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Gift className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-white/90 block">{t('nav.referral', 'Parrainage')}</span>
                    <span className="text-xs text-cyan-300">🎁 5Ⓐ pour toi + 5Ⓐ pour ton ami</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/40" />
                </Link>

                <Link 
                  to="/how-to-use" 
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 active:scale-98"
                  onClick={closeMenu}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                    <HelpCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium text-white/90">{t('nav.howToUse')}</span>
                  <ArrowRight className="h-4 w-4 ml-auto text-white/40" />
                </Link>
                
                <Link 
                  to="/support" 
                  className="flex items-center gap-4 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 active:scale-98"
                  onClick={closeMenu}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <HelpCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium text-white/90">{t('nav.support', 'Support')}</span>
                  <ArrowRight className="h-4 w-4 ml-auto text-white/40" />
                </Link>
              </div>

              {/* Logout Button */}
              <div className="mt-auto pt-4 border-t border-white/10">
                <button
                  onClick={() => { signOut(); closeMenu(); }}
                  className="flex w-full items-center gap-4 px-4 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 transition-all duration-300 hover:bg-red-500/20 active:scale-98"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-lg shadow-red-500/20">
                    <LogOut className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium text-red-300">{t('nav.logout', 'Déconnexion')}</span>
                </button>
              </div>
            </>
          ) : !user && (
            <>
              {/* Guest Navigation */}
              <div className="space-y-3 mb-8">
                <Link 
                  to="/how-to-use" 
                  className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:bg-white/15 hover:border-white/20 active:scale-98"
                  onClick={closeMenu}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <HelpCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">{t('nav.howToUse')}</span>
                    <span className="text-sm text-white/50">Guide d'utilisation</span>
                  </div>
                  <ArrowRight className="h-5 w-5 ml-auto text-white/40 group-hover:translate-x-1 transition-transform" />
                </Link>

                <a 
                  href="/#pricing" 
                  className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:bg-white/15 hover:border-white/20 active:scale-98"
                  onClick={closeMenu}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">{t('nav.pricing')}</span>
                    <span className="text-sm text-white/50">Nos tarifs compétitifs</span>
                  </div>
                  <ArrowRight className="h-5 w-5 ml-auto text-white/40 group-hover:translate-x-1 transition-transform" />
                </a>

                <Link 
                  to="/terms" 
                  className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 transition-all duration-300 hover:bg-white/15 hover:border-white/20 active:scale-98"
                  onClick={closeMenu}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">{t('footer.terms')}</span>
                    <span className="text-sm text-white/50">Conditions d'utilisation</span>
                  </div>
                  <ArrowRight className="h-5 w-5 ml-auto text-white/40 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Language Switch */}
              <button
                onClick={toggleLanguage}
                className="flex w-full items-center gap-4 px-5 py-4 rounded-2xl bg-white/5 border border-white/10 transition-all duration-300 hover:bg-white/10 active:scale-98 mb-8"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-gray-500 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium text-white/80">
                  {i18n.language === 'en' ? 'Français' : 'English'}
                </span>
                <span className="text-2xl ml-auto">{i18n.language === 'en' ? '🇫🇷' : '🇬🇧'}</span>
              </button>

              {/* Auth Buttons */}
              <div className="mt-auto space-y-3">
                <Link to="/register" onClick={closeMenu} className="block">
                  <Button 
                    className="h-14 w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 text-base font-bold shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-[1.02] active:scale-98"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    {t('nav.register')}
                  </Button>
                </Link>
                <Link to="/login" onClick={closeMenu} className="block">
                  <Button 
                    variant="outline" 
                    className="h-14 w-full rounded-2xl text-base font-semibold border-2 border-white/20 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/30 transition-all"
                  >
                    {t('nav.login')}
                  </Button>
                </Link>
              </div>
              
              {/* Trust badges */}
              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-white/40">
                <span className="flex items-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  Sécurisé
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4" />
                  Instantané
                </span>
                <span>24/7</span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
