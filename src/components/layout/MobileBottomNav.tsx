import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Wallet, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

export default function MobileBottomNav() {
    const { t } = useTranslation()
    const location = useLocation()

    const isActive = (path: string) => location.pathname === path

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-[340px] md:hidden">
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] rounded-[2rem] px-6 h-[68px] flex justify-between items-center"
            >
                {/* Left Item: Home */}
                <NavItem 
                    item={{ path: '/dashboard', icon: Home, label: t('nav.home', 'Accueil') }} 
                    isActive={isActive('/dashboard')} 
                />

                {/* Center Action Button - Buy Number */}
                <div className="relative flex flex-col items-center justify-center -mt-6 z-20">
                    <motion.div
                        animate={{ 
                            boxShadow: isActive('/buy') 
                                ? ["0px 0px 0px rgba(37,99,235,0)", "0px 4px 20px rgba(37,99,235,0.6)", "0px 0px 0px rgba(37,99,235,0)"]
                                : "0px 8px 16px rgba(37,99,235,0.25)"
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="rounded-full"
                    >
                        <Link to="/buy" data-tutorial="buy-button">
                            <motion.div 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                    "w-[56px] h-[56px] rounded-full flex items-center justify-center border-[4px] border-white dark:border-gray-900 backdrop-blur-md relative overflow-hidden transition-all duration-300",
                                    "bg-blue-600"
                                )}
                            >
                                {/* Shiny inner reflection */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <ShoppingCart 
                                    className="w-6 h-6 text-white relative z-10" 
                                    strokeWidth={2.5}
                                />
                            </motion.div>
                        </Link>
                    </motion.div>
                </div>

                {/* Right Item: Wallet */}
                <NavItem 
                    item={{ path: '/top-up', icon: Wallet, label: t('nav.topUp', 'Recharger') }} 
                    isActive={isActive('/top-up')} 
                />
            </motion.div>
        </div>
    )
}

function NavItem({ item, isActive }: { item: any, isActive: boolean }) {
    return (
        <Link
            to={item.path}
            className="relative flex flex-col items-center justify-center w-[72px] h-full z-10 group"
        >
            <motion.div 
                whileTap={{ scale: 0.9, transition: { type: "spring", stiffness: 400, damping: 17 } }}
                className="relative flex flex-col items-center justify-center w-full h-full rounded-2xl"
            >
                {/* Active Indicator Bubble */}
                {isActive && (
                    <motion.div
                        layoutId="active-pill"
                        className="absolute inset-y-2 inset-x-0 bg-blue-50/80 dark:bg-blue-500/10 rounded-2xl"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 25, mass: 1 }}
                    />
                )}
                
                <div className="relative z-10 flex flex-col items-center gap-1">
                    <item.icon 
                        className={cn(
                            "w-[22px] h-[22px] transition-all duration-300",
                            isActive 
                                ? "text-blue-600 dark:text-blue-400" 
                                : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"
                        )} 
                        strokeWidth={isActive ? 2.5 : 2} 
                    />
                    <span 
                        className={cn(
                            "text-[10px] transition-all duration-300",
                            isActive 
                                ? "font-bold text-blue-600 dark:text-blue-400" 
                                : "font-medium text-gray-500 dark:text-gray-400 group-hover:text-gray-700"
                        )}
                    >
                        {item.label}
                    </span>
                </div>
            </motion.div>
        </Link>
    )
}
