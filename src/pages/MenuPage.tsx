import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Wallet, HelpCircle, Shield, Globe, Zap, Gift, ChevronRight, Mail, LogOut, FileText, Router, History } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useRealtimeBalance } from '@/hooks/useRealtimeBalance'
import { useFeatures } from '@/hooks/useFeatures'

export default function MenuPage() {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const { user, signOut } = useAuthStore()

    // Realtime balance
    const { balance, frozen } = useRealtimeBalance();

    // Feature flags
    const { isRentalsEnabled } = useFeatures()

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
        <div className="min-h-screen bg-slate-50 pb-20 relative overflow-hidden font-sans">

            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-100/40 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="p-4 space-y-4 relative z-10 w-full max-w-md mx-auto pt-6">

                {/* Balance Card - Compact Version */}
                {user && (
                    <div className="relative overflow-hidden rounded-2xl p-4 shadow-lg shadow-blue-500/10 group transition-all">
                        {/* Card Background Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500" />

                        {/* Decor */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -translate-y-1/3 translate-x-1/3" />

                        <div className="relative z-10 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-blue-100 text-xs font-medium tracking-wide mb-0.5 opacity-90">{t('dashboard.balance')}</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white tracking-tight">{Math.floor(balance ?? 0)}</span>
                                    <span className="text-sm font-bold text-blue-100/80">Ⓐ</span>
                                </div>
                                {frozen > 0 && (
                                    <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded bg-black/20 text-[10px] font-medium text-white/90 border border-white/10">
                                        <Shield className="w-2.5 h-2.5 mr-1 text-orange-300" />
                                        {Math.floor(frozen)} Ⓐ gelés
                                    </div>
                                )}
                            </div>

                            <Link to="/top-up">
                                <Button size="sm" className="bg-white/95 hover:bg-white text-blue-600 font-bold rounded-xl shadow-lg shadow-black/10 hover:shadow-xl transition-all active:scale-[0.98]">
                                    <Zap className="w-3.5 h-3.5 mr-1.5 fill-current" />
                                    {t('nav.topUp')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {/* Settings & Navigation List */}
                {user && user.role !== 'admin' ? (
                    <div className="space-y-3">

                        {/* Group: Account */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-200/50 overflow-hidden divide-y divide-gray-50">

                            {/* Language */}
                            <button
                                onClick={toggleLanguage}
                                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors active:bg-gray-100 group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center border border-cyan-100">
                                    <Globe className="w-4 h-4 text-cyan-600" />
                                </div>
                                <span className="flex-1 text-left text-sm font-semibold text-gray-700">
                                    {i18n.language === 'en' ? 'Langue' : 'Language'}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-gray-500">{i18n.language === 'en' ? 'English' : 'Français'}</span>
                                    <span className="text-base border border-gray-200 rounded px-1.5 bg-gray-50">{i18n.language === 'en' ? '🇬🇧' : '🇫🇷'}</span>
                                </div>
                            </button>

                            {/* History - NEW */}
                            <Link to="/history" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors active:bg-gray-100 group">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors border border-indigo-100">
                                    <History className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <span className="text-sm font-semibold text-gray-700 block">{t('nav.history', 'Historique')}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                            </Link>

                            {/* Referral */}
                            <Link to="/referral" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors active:bg-gray-100 group">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors border border-blue-100">
                                    <Gift className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <span className="text-sm font-semibold text-gray-700 block">{t('nav.referral')}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                            </Link>

                        </div>

                        {/* Group: Support & Info */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-200/50 overflow-hidden divide-y divide-gray-50">
                            <Link to="/support" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors active:bg-gray-100 group">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors border border-purple-100">
                                    <Mail className="w-4 h-4 text-purple-600" />
                                </div>
                                <span className="flex-1 text-sm font-semibold text-gray-700">{t('nav.support')}</span>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-purple-400 transition-colors" />
                            </Link>

                            <Link to="/how-to-use" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors active:bg-gray-100 group">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors border border-emerald-100">
                                    <HelpCircle className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="flex-1 text-sm font-semibold text-gray-700">{t('nav.howToUse')}</span>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-400 transition-colors" />
                            </Link>

                            <Link to="/terms" className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors active:bg-gray-100 group">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors border border-orange-100">
                                    <FileText className="w-4 h-4 text-orange-600" />
                                </div>
                                <span className="flex-1 text-sm font-semibold text-gray-700">Conditions</span>
                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-400 transition-colors" />
                            </Link>
                        </div>

                        {/* Logout */}
                        <button
                            onClick={handleSignOut}
                            className="w-full bg-red-50 hover:bg-red-100 rounded-xl p-3 flex items-center justify-center gap-2 text-red-600 font-bold transition-all active:scale-[0.98]"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm">{t('nav.logout', 'Se déconnecter')}</span>
                        </button>

                    </div>
                ) : !user && (
                    <div className="space-y-6">
                        {/* Guest View */}
                        <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm text-center space-y-4">
                            <div className="w-16 h-16 rounded-full bg-blue-50 mx-auto flex items-center justify-center">
                                <Zap className="w-8 h-8 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-1">Rejoignez-nous</h2>
                                <p className="text-sm text-gray-500">Créez un compte pour commencer.</p>
                            </div>

                            <div className="grid gap-3 pt-2">
                                <Link to="/register">
                                    <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20">
                                        {t('nav.register')}
                                    </Button>
                                </Link>
                                <Link to="/login">
                                    <Button variant="outline" className="w-full h-12 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl">
                                        {t('nav.login')}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}


                {/* Trust Badges - Footer */}
                <div className="pt-2 pb-2">
                    <p className="text-center text-gray-300 text-[10px] font-medium">
                        ONE SMS v1.0 • © 2026
                    </p>
                </div>

            </div>
        </div>
    )
}
