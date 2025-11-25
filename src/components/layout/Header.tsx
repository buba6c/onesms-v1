import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Menu, User, LogOut, Wallet, MessageSquare } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

// Component to display balance with frozen amount
function HeaderBalanceDisplay({ userId, balance }: { userId: string; balance: number }) {
  // Calculate frozen balance from pending/waiting activations (charged=false)
  // Ces activations ont déjà leur prix déduit du balance mais pas encore confirmées
  const { data: frozenAmount = 0 } = useQuery<number>({
    queryKey: ['frozen-balance', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('activations')
        .select('price')
        .eq('user_id', userId)
        .in('status', ['pending', 'waiting'])
        .eq('charged', false);
      
      const total = (data as any[])?.reduce((sum: number, act: any) => sum + (act.price || 0), 0) || 0;
      return total;
    },
    enabled: !!userId,
    refetchInterval: 5000, // Refresh every 5s
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
    refetchInterval: 3000,
  });

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
      <div className="h-4 w-px bg-gray-300"></div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-600">Frozen:</span>
        <span className="font-semibold text-orange-600">{Math.floor(frozenAmount)} Ⓐ</span>
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

  useEffect(() => {
    // Redirect logged in users to dashboard if they visit homepage
    if (user && window.location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-3">
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
                  <Button variant="ghost" className="font-medium">Top up</Button>
                </Link>
                <Link to="/settings">
                  <Button variant="ghost" className="font-medium">Account</Button>
                </Link>
                <Link to="/history">
                  <Button variant="ghost" className="font-medium">History</Button>
                </Link>
                <a href="#how-to-use">
                  <Button variant="ghost" className="font-medium">How to use</Button>
                </a>
                <a href="#contacts">
                  <Button variant="ghost" className="font-medium">Contacts</Button>
                </a>
              </>
            ) : !user && (
              <>
                <Link to="/catalog">
                  <Button variant="ghost" className="font-medium">Services</Button>
                </Link>
                <a href="#features">
                  <Button variant="ghost" className="font-medium">Features</Button>
                </a>
                <a href="#pricing">
                  <Button variant="ghost" className="font-medium">Pricing</Button>
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

            {/* Language Selector */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-xl">🇬🇧</span>
              <span className="text-sm font-medium hidden md:inline">English</span>
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
                  <Button className="bg-blue-600 hover:bg-blue-700">Get Started</Button>
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

        {/* Mobile Menu - Uniquement pour les utilisateurs normaux */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-3">
              <Link to="/catalog" className="py-2">{t('nav.catalog')}</Link>
              {user && user.role !== 'admin' && (
                <>
                  <Link to="/my-numbers" className="py-2">{t('nav.myNumbers')}</Link>
                  <Link to="/history" className="py-2">{t('nav.history')}</Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
