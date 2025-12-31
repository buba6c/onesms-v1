import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Clock, Menu, Wallet, ShoppingCart, Smartphone } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

export default function MobileBottomNav() {
    const { t } = useTranslation()
    const location = useLocation()
    const { toggleMobileMenu, mobileMenuOpen } = useUIStore()

    const isActive = (path: string) => location.pathname === path

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-gray-100 pb-safe md:hidden shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16 px-2">
                {/* Home */}
                <Link
                    to="/dashboard"
                    className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-2xl space-y-1 transition-all",
                        isActive('/dashboard')
                            ? "text-blue-600 bg-blue-50 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Home className={cn("w-6 h-6", isActive('/dashboard') && "fill-current")} />
                    <span className="text-[10px] font-medium">{t('nav.home', 'Accueil')}</span>
                </Link>



                {/* Center Action Button - Buy Number */}
                <Link to="/buy" data-tutorial="buy-button">
                    <div className="w-14 h-14 -mt-6 rounded-full bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/40 hover:shadow-cyan-400/50 transform transition-all active:scale-95 border-4 border-white dark:border-gray-900 group">
                        <ShoppingCart className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                    </div>
                </Link>

                {/* Wallet / Services */}
                <Link
                    to="/top-up"
                    data-tutorial="topup-button"
                    className={cn(
                        "flex flex-col items-center justify-center w-16 h-12 rounded-2xl space-y-1 transition-all",
                        isActive('/top-up')
                            ? "text-blue-600 bg-blue-50 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                    )}
                >
                    <Wallet className={cn("w-6 h-6", isActive('/top-up') && "fill-current")} />
                    <span className="text-[10px] font-medium">{t('nav.topUp', 'Recharger')}</span>
                </Link>


            </div>
        </div>
    )
}
