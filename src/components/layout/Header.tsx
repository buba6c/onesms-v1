import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { User, LogOut, Wallet, Clock, HelpCircle, X, Sparkles, ChevronRight, Home, Shield, Globe, Zap, ArrowRight, DollarSign, FileText, Gift, Menu, Smartphone } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance'
import { useUIStore } from '@/stores/uiStore'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
  const [scrolled, setScrolled] = useState(false)
  const { user, signOut } = useAuthStore()
  const { mobileMenuOpen, setMobileMenuOpen, toggleMobileMenu } = useUIStore()

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
              <div className={`hidden w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center text-white font-bold text-base md:text-lg shadow-lg transition-transform group-hover:scale-105 ${isTransparent
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
                    <Button variant="ghost" className={`font-medium ${textColorClass} hover:bg-white/10`}>{t('nav.history', 'Historique')}</Button>
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
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl transition-all duration-200 ${isTransparent
                  ? 'bg-white/10 hover:bg-white/20 border border-white/20'
                  : 'hover:bg-gray-100 border border-gray-200'
                  }`}
                title={i18n.language === 'en' ? 'Switch to French' : 'Passer en anglais'}
              >
                <span className="text-lg">{i18n.language === 'en' ? '🇬🇧' : '🇫🇷'}</span>
                <span className={`text-xs font-semibold hidden sm:inline ${isTransparent ? 'text-white' : 'text-gray-700'
                  }`}>{i18n.language === 'en' ? 'EN' : 'FR'}</span>
              </button>

              {user ? (
                <div className="hidden md:flex items-center gap-2">
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
                    <Button className={`font-semibold shadow-lg transition-all hover:scale-105 ${isTransparent
                      ? 'bg-white text-blue-600 hover:bg-gray-100'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white'
                      }`}>
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      {t('nav.register')}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Profile Dropdown REMOVED as per request */}
              {user && (
                <div className="md:hidden flex items-center gap-2">
                  <Link to="/top-up">
                    <div className="flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 active:scale-95 transition-all">
                      <span className="font-black text-blue-600 text-sm">{Math.floor(currentBalance - currentFrozen)} Ⓐ</span>
                    </div>
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button - Visible on mobile */}
              {/* Mobile Menu Button - Links to Menu Page */}
              {/* Mobile Menu Button - Links to Menu Page if logged in, otherwise opens drawer */}
              {user ? (
                <Link to="/menu" className="md:hidden p-2 -mr-2 text-gray-700">
                  <Menu className="w-6 h-6" />
                </Link>
              ) : (
                <button
                  className={`md:hidden p-2 -mr-2 ${isTransparent ? 'text-white' : 'text-gray-700'}`}
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <div className="p-2"><Menu className="w-6 h-6" /></div>}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {/* Mobile Menu Overlay */}
      {/* Mobile Menu Overlay - Premium Design */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-2xl md:hidden animate-in slide-in-from-right-10 duration-300 flex flex-col">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Menu Header */}
          <div className="relative z-10 flex items-center justify-between px-6 h-20 border-b border-gray-100/50 bg-white/50 backdrop-blur-sm">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
              <img src="/logos/One SMS 4w png.png" alt="Logo" className="h-12 w-auto opacity-100" />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-9 h-9 p-0 rounded-full text-gray-600 hover:bg-gray-100/80 dark:text-gray-300 dark:hover:bg-gray-800/80 active:scale-95 transition-all duration-150">
                  <User className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
            </DropdownMenu>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

            {/* User Profile Card (if logged in) */}
            {user ? (
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-6 shadow-xl shadow-blue-500/20 text-white">
                {/* Decorative Circles */}
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>

                <div className="relative z-10 flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-white/30 shadow-sm">
                      <AvatarImage src={user.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-white/20 text-white font-bold backdrop-blur-md">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-bold text-lg leading-tight">{user.user_metadata?.full_name || 'Expert SMS'}</p>
                      <p className="text-blue-100 text-xs font-medium tracking-wide opacity-90">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/20 flex items-end justify-between">
                  <div>
                    <p className="text-blue-100 text-xs font-medium uppercase tracking-wider mb-1">Solde Disponible</p>
                    <p className="text-3xl font-black tracking-tight">{Math.floor(currentBalance - currentFrozen)} <span className="text-lg opacity-80 font-bold">Ⓐ</span></p>
                  </div>
                  <Link to="/top-up" onClick={closeMenu}>
                    <Button size="sm" className="bg-white text-blue-600 hover:bg-blue-50 border-0 font-bold shadow-sm h-9 px-4 rounded-xl">
                      <Zap className="w-4 h-4 mr-1.5 fill-blue-600" />
                      Recharger
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              // Guest Welcome Card
              <div className="rounded-3xl bg-gradient-to-br from-blue-50/50 to-cyan-50/50 border border-blue-100 p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 text-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-sm shadow-blue-100">
                  <Sparkles className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Bienvenue sur <span className="text-blue-600">One SMS</span></h3>
                  <p className="text-sm text-gray-500 mt-1 font-medium">La plateforme n°1 de numéros virtuels.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full pt-2">
                  <Link to="/login" onClick={closeMenu} className="w-full">
                    <Button variant="outline" className="w-full h-11 rounded-xl font-bold border-blue-200 text-blue-700 hover:border-blue-300 hover:text-blue-800 hover:bg-blue-50">
                      Connexion
                    </Button>
                  </Link>
                  <Link to="/register" onClick={closeMenu} className="w-full">
                    <Button className="w-full h-11 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-500/20">
                      S'inscrire
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-6">
              {/* Section: Principal */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-blue-900/50 uppercase tracking-wider px-2">Principal</h4>

                <div className="grid grid-cols-1 gap-2">
                  {user ? (
                    <>
                      <Link to="/dashboard" onClick={closeMenu} className="group flex items-center p-3 rounded-2xl hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mr-4 group-hover:bg-blue-600 group-hover:text-white transition-colors border border-blue-100 group-hover:border-transparent">
                          <Home className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <span className="block font-semibold text-gray-900 group-hover:text-blue-700">Accueil</span>
                          <span className="text-xs text-gray-500 group-hover:text-blue-400">Tableau de bord</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
                      </Link>

                      <Link to="/my-numbers" onClick={closeMenu} className="group flex items-center p-3 rounded-2xl hover:bg-purple-50 transition-all border border-transparent hover:border-purple-100">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mr-4 group-hover:bg-purple-600 group-hover:text-white transition-colors border border-purple-100 group-hover:border-transparent">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <span className="block font-semibold text-gray-900 group-hover:text-purple-700">{t('nav.myNumbers')}</span>
                          <span className="text-xs text-gray-500 group-hover:text-purple-400">Vos numéros actifs</span>
                        </div>
                      </Link>



                      <Link to="/top-up" onClick={closeMenu} className="group flex items-center p-3 rounded-2xl hover:bg-amber-50 transition-all border border-transparent hover:border-amber-100">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mr-4 group-hover:bg-amber-500 group-hover:text-white transition-colors border border-amber-100 group-hover:border-transparent">
                          <Zap className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <span className="block font-semibold text-gray-900 group-hover:text-amber-700">Recharger</span>
                          <span className="text-xs text-gray-500 group-hover:text-amber-400">Ajouter des crédits</span>
                        </div>
                      </Link>
                    </>
                  ) : (
                    <>
                      <a href="/#pricing" onClick={closeMenu} className="group flex items-center p-3 rounded-2xl hover:bg-emerald-50 transition-all border border-transparent hover:border-emerald-100">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mr-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors border border-emerald-100 group-hover:border-transparent">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <span className="block font-semibold text-gray-900 group-hover:text-emerald-700">Tarifs</span>
                          <span className="text-xs text-gray-500 group-hover:text-emerald-400">Nos offres</span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all -ml-2 group-hover:ml-0" />
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Section: Support & Info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-blue-900/50 uppercase tracking-wider px-2">Support & Compte</h4>
                <div className="grid grid-cols-1 gap-2">
                  <Link to="/how-to-use" onClick={closeMenu} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-cyan-50 text-gray-600 hover:text-cyan-800 transition-all border border-transparent hover:border-cyan-100">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-cyan-100 transition-colors">
                        <HelpCircle className="w-4 h-4 text-gray-400 group-hover:text-cyan-600" />
                      </div>
                      <span className="font-semibold">Comment ça marche</span>
                    </div>
                  </Link>

                  <Link to="/support" onClick={closeMenu} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-blue-50 text-gray-600 hover:text-blue-800 transition-all border border-transparent hover:border-blue-100">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                        <Shield className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      </div>
                      <span className="font-semibold">Support Client</span>
                    </div>
                  </Link>

                  <Link to="/terms" onClick={closeMenu} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50 text-gray-600 hover:text-orange-800 transition-all border border-transparent hover:border-orange-100">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                        <FileText className="w-4 h-4 text-gray-400 group-hover:text-orange-600" />
                      </div>
                      <span className="font-semibold">Conditions d'utilisation</span>
                    </div>
                  </Link>

                  {user && (
                    <Link to="/settings" onClick={closeMenu} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-indigo-50 text-gray-600 hover:text-indigo-800 transition-all border border-transparent hover:border-indigo-100">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                          <User className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
                        </div>
                        <span className="font-semibold">Mon Compte</span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            {user && (
              <div className="pt-4">
                <button
                  onClick={() => { closeMenu(); signOut(); }}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
