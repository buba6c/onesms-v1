import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CookieManager } from '@/utils/cookieManager'
import { useTranslation } from 'react-i18next'

export function CookieConsent() {
    const [isVisible, setIsVisible] = useState(false)
    const { t } = useTranslation()

    useEffect(() => {
        // Check if user has already made a choice
        const consent = CookieManager.get('cookie_consent')
        if (!consent) {
            // Delay showing slightly for better UX
            const timer = setTimeout(() => setIsVisible(true), 1500)
            return () => clearTimeout(timer)
        }
    }, [])

    const handleAccept = () => {
        CookieManager.set('cookie_consent', 'accepted', { days: 365, sameSite: 'Lax' })
        setIsVisible(false)
        // Here we would typically enable analytics (GA, Pixel, etc.)
        console.log('[Cookies] Consent accepted')
    }

    const handleDecline = () => {
        CookieManager.set('cookie_consent', 'declined', { days: 365, sameSite: 'Lax' })
        setIsVisible(false)
        // Ensure all optional coolies are cleared
        console.log('[Cookies] Consent declined')
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed bottom-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-[400px]"
                >
                    <div className="relative overflow-hidden rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-xl border border-white/20 dark:bg-slate-900/95 dark:border-slate-800">
                        {/* Background Decoration */}
                        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl"></div>
                        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl"></div>

                        <div className="relative flex flex-col gap-4">
                            {/* Header */}
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20">
                                    <Cookie className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        {t('cookies.title', 'Cookies & Confidentialité')}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                        {t('cookies.description', 'Nous utilisons des cookies pour améliorer votre expérience et analyser notre trafic. Acceptez-vous notre politique ?')}
                                    </p>
                                </div>
                                <button
                                    onClick={handleDecline}
                                    className="absolute right-0 top-0 -mr-2 -mt-2 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={handleDecline}
                                    className="flex-1 border-gray-200 hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                >
                                    {t('cookies.decline', 'Refuser')}
                                </Button>
                                <Button
                                    onClick={handleAccept}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                                >
                                    {t('cookies.accept', 'Accepter')}
                                </Button>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                                <Shield className="h-3 w-3" />
                                <a href="/privacy" className="hover:underline hover:text-blue-500 transition-colors">
                                    {t('cookies.policy', 'Politique de confidentialité')}
                                </a>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
