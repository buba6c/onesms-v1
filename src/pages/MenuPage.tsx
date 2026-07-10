import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Wallet, HelpCircle, Shield, Globe, Zap, Gift, ChevronRight, Mail, LogOut, FileText, History } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08
        }
    }
}

const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { 
        opacity: 1, 
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 24 }
    }
}

export default function MenuPage() {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const { user, signOut } = useAuthStore()

    // Realtime balance
    const { balance, frozen } = useRealtimeBalance();

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

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 pb-28 relative overflow-hidden font-sans">

            {/* Premium Animated Background Orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden flex justify-center items-center">
                <motion.div 
                    animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/20 rounded-full blur-[100px]" 
                />
                <motion.div 
                    animate={{ rotate: -360, scale: [1, 1.2, 1] }} 
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-cyan-300/20 dark:bg-cyan-600/20 rounded-full blur-[120px]" 
                />
            </div>

            <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="p-5 space-y-5 relative z-10 w-full max-w-md mx-auto pt-6"
            >

                {/* Balance Card - Premium Glass Version */}
                {user && (
                    <motion.div variants={itemVariants} className="relative overflow-hidden rounded-[2rem] p-6 shadow-2xl shadow-blue-500/20 group">
                        {/* Animated Mesh Gradient Background */}
                        <div className="absolute inset-0 bg-blue-600" />
                        <motion.div 
                            animate={{ x: ["0%", "-50%", "0%"], y: ["0%", "50%", "0%"] }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-transparent to-blue-800 opacity-60 mix-blend-overlay w-[200%] h-[200%]" 
                        />
                        
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                        <div className="relative z-10 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-blue-100/90 text-[11px] font-semibold tracking-wider uppercase mb-1">{t('dashboard.balance')}</p>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-4xl font-extrabold text-white tracking-tight drop-shadow-sm">{Math.floor(balance ?? 0)}</span>
                                    <span className="text-lg font-bold text-blue-200">Ⓐ</span>
                                </div>
                                {frozen > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-md text-[10px] font-bold text-white/90 border border-white/10 shadow-inner"
                                    >
                                        <Shield className="w-3 h-3 mr-1.5 text-orange-400" />
                                        {Math.floor(frozen)} Ⓐ gelés
                                    </motion.div>
                                )}
                            </div>

                            <Link to="/top-up">
                                <motion.div 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="bg-white/95 backdrop-blur-sm hover:bg-white text-blue-600 font-bold rounded-2xl shadow-xl shadow-black/10 transition-all flex items-center justify-center px-4 py-3"
                                >
                                    <Zap className="w-4 h-4 mr-2 fill-blue-600 text-blue-600" />
                                    {t('nav.topUp')}
                                </motion.div>
                            </Link>
                        </div>
                    </motion.div>
                )}

                {/* Settings & Navigation List */}
                {user && user.role !== 'admin' ? (
                    <div className="space-y-4">

                        {/* Group: Account */}
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2rem] border border-gray-200/50 dark:border-gray-800/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 overflow-hidden">
                            <MenuItem 
                                icon={Globe} 
                                iconColor="text-cyan-600 dark:text-cyan-400" 
                                iconBg="bg-cyan-50 dark:bg-cyan-500/10"
                                label={i18n.language === 'en' ? 'Language' : 'Langue'}
                                onClick={toggleLanguage}
                                rightContent={
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{i18n.language === 'en' ? 'English' : 'Français'}</span>
                                        <span className="text-lg leading-none">{i18n.language === 'en' ? '🇬🇧' : '🇫🇷'}</span>
                                    </div>
                                }
                            />
                            <div className="h-[1px] w-full bg-gray-100 dark:bg-gray-800/50 ml-14" />
                            <MenuItem 
                                icon={History} 
                                iconColor="text-indigo-600 dark:text-indigo-400" 
                                iconBg="bg-indigo-50 dark:bg-indigo-500/10"
                                label={t('nav.history', 'Historique')}
                                to="/history"
                            />
                            <div className="h-[1px] w-full bg-gray-100 dark:bg-gray-800/50 ml-14" />
                            <MenuItem 
                                icon={Gift} 
                                iconColor="text-blue-600 dark:text-blue-400" 
                                iconBg="bg-blue-50 dark:bg-blue-500/10"
                                label={t('nav.referral', 'Parrainage')}
                                to="/referral"
                            />
                        </motion.div>

                        {/* Group: Support & Info */}
                        <motion.div variants={itemVariants} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl rounded-[2rem] border border-gray-200/50 dark:border-gray-800/50 shadow-xl shadow-gray-200/20 dark:shadow-black/20 overflow-hidden">
                            <MenuItem 
                                icon={Mail} 
                                iconColor="text-purple-600 dark:text-purple-400" 
                                iconBg="bg-purple-50 dark:bg-purple-500/10"
                                label={t('nav.support', 'Support')}
                                to="/support"
                            />
                            <div className="h-[1px] w-full bg-gray-100 dark:bg-gray-800/50 ml-14" />
                            <MenuItem 
                                icon={HelpCircle} 
                                iconColor="text-emerald-600 dark:text-emerald-400" 
                                iconBg="bg-emerald-50 dark:bg-emerald-500/10"
                                label={t('nav.howToUse', 'Comment utiliser')}
                                to="/how-to-use"
                            />
                            <div className="h-[1px] w-full bg-gray-100 dark:bg-gray-800/50 ml-14" />
                            <MenuItem 
                                icon={FileText} 
                                iconColor="text-orange-600 dark:text-orange-400" 
                                iconBg="bg-orange-50 dark:bg-orange-500/10"
                                label="Conditions"
                                to="/terms"
                            />
                        </motion.div>

                        {/* Logout */}
                        <motion.div variants={itemVariants}>
                            <button
                                onClick={handleSignOut}
                                className="w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-[2rem] p-4 flex items-center justify-center gap-3 text-red-600 dark:text-red-500 font-bold shadow-xl shadow-red-500/5 transition-all active:scale-[0.98] group"
                            >
                                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                <span className="text-sm tracking-wide">{t('nav.logout', 'Se déconnecter')}</span>
                            </button>
                        </motion.div>

                    </div>
                ) : !user && (
                    <motion.div variants={itemVariants} className="space-y-6 pt-4">
                        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-3xl rounded-[2.5rem] p-8 border border-gray-200/50 shadow-2xl text-center space-y-6">
                            <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-500/10 mx-auto flex items-center justify-center shadow-inner">
                                <Zap className="w-10 h-10 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Rejoignez-nous</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Créez un compte pour commencer.</p>
                            </div>

                            <div className="grid gap-3 pt-4">
                                <Link to="/register">
                                    <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 text-lg">
                                        {t('nav.register')}
                                    </Button>
                                </Link>
                                <Link to="/login">
                                    <Button variant="outline" className="w-full h-14 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 font-bold rounded-2xl text-lg">
                                        {t('nav.login')}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Trust Badges - Footer */}
                <motion.div variants={itemVariants} className="pt-6 pb-2">
                    <p className="text-center text-gray-400 dark:text-gray-600 text-[10px] font-bold tracking-widest uppercase">
                        ONE SMS v1.0 • © 2026
                    </p>
                </motion.div>

            </motion.div>
        </div>
    )
}

function MenuItem({ 
    icon: Icon, 
    iconColor, 
    iconBg, 
    label, 
    to, 
    onClick, 
    rightContent 
}: { 
    icon: any, 
    iconColor: string, 
    iconBg: string, 
    label: string, 
    to?: string, 
    onClick?: () => void,
    rightContent?: React.ReactNode
}) {
    const Component = to ? Link : 'button'
    
    return (
        <Component
            to={to as any}
            onClick={onClick}
            className="w-full flex items-center gap-4 p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors active:bg-gray-100 dark:active:bg-gray-800 group"
        >
            <div className={cn("w-10 h-10 rounded-[14px] flex items-center justify-center border border-white/50 dark:border-gray-700/50 shadow-sm transition-transform group-hover:scale-110", iconBg)}>
                <Icon className={cn("w-5 h-5", iconColor)} strokeWidth={2.5} />
            </div>
            <div className="flex-1 text-left">
                <span className="text-[15px] font-bold text-gray-800 dark:text-gray-100">{label}</span>
            </div>
            {rightContent ? rightContent : (
                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-colors group-hover:translate-x-1" strokeWidth={2.5} />
            )}
        </Component>
    )
}
