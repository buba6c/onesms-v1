import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
    Shield,
    Globe,
    Zap,
    Users,
    CheckCircle2,
    ArrowRight,
    Clock,
    Heart,
    Target,
    Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

const fadeInLeft = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

const fadeInRight = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: 'easeOut' } }
}

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.15 }
    }
}

export default function AboutPage() {
    const { t } = useTranslation()

    const stats = [
        { label: t('about.stats.users'), value: '15,000+', icon: Users, color: 'from-blue-500 to-cyan-500' },
        { label: t('about.stats.verifications'), value: '2M+', icon: CheckCircle2, color: 'from-green-500 to-emerald-500' },
        { label: t('about.stats.uptime'), value: '99.9%', icon: Zap, color: 'from-amber-500 to-orange-500' },
        { label: t('about.stats.countries'), value: '190+', icon: Globe, color: 'from-purple-500 to-pink-500' },
    ]

    const values = [
        {
            icon: Shield,
            title: t('about.values.privacy'),
            description: t('about.values.privacyDesc'),
            gradient: 'from-blue-500 to-indigo-600',
        },
        {
            icon: Globe,
            title: t('about.values.accessibility'),
            description: t('about.values.accessibilityDesc'),
            gradient: 'from-purple-500 to-pink-600',
        },
        {
            icon: Zap,
            title: t('about.values.excellence'),
            description: t('about.values.excellenceDesc'),
            gradient: 'from-amber-500 to-orange-600',
        },
        {
            icon: Heart,
            title: t('about.values.trust'),
            description: t('about.values.trustDesc'),
            gradient: 'from-rose-500 to-red-600',
        },
    ]



    const features = [
        t('about.features.nonVoip'),
        t('about.features.instant'),
        t('about.features.global'),
        t('about.features.secure'),
        t('about.features.support'),
        t('about.features.refund'),
    ]

    return (
        <div className="min-h-screen bg-white overflow-hidden">
            {/* Hero Section */}
            <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
                {/* Background Effects */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl"></div>
                </div>

                <div className="container mx-auto px-4 relative z-10">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                        className="max-w-4xl mx-auto text-center"
                    >
                        <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-full text-sm font-semibold mb-8">
                            <Award className="w-4 h-4 text-cyan-400" />
                            {t('about.hero.badge')}
                        </motion.div>

                        <motion.h1 variants={fadeInUp} className="text-4xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight tracking-tight">
                            {t('about.hero.title')} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                                {t('about.hero.titleHighlight')}
                            </span>
                        </motion.h1>

                        <motion.p variants={fadeInUp} className="text-lg md:text-xl text-blue-100/80 mb-12 max-w-2xl mx-auto leading-relaxed">
                            {t('about.hero.description')}
                        </motion.p>

                        <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-4">
                            <Link to="/register">
                                <Button size="lg" className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-14 px-8 text-lg font-bold shadow-lg shadow-cyan-500/30 transition-all hover:scale-105">
                                    {t('about.hero.cta')} <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                            </Link>

                        </motion.div>
                    </motion.div>
                </div>

                {/* Wave Divider */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                        <path d="M0 120L60 110C120 100 240 80 360 75C480 70 600 80 720 85C840 90 960 90 1080 85C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" />
                    </svg>
                </div>
            </section>

            {/* Stats Section */}
            <section className="relative -mt-2 pb-16 md:pb-24 bg-white">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto"
                    >
                        {stats.map((stat, index) => (
                            <motion.div
                                key={index}
                                variants={fadeInUp}
                                className="group bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className={`w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                                    <stat.icon className="w-6 h-6 md:w-7 md:h-7 text-white" />
                                </div>
                                <div className="text-2xl md:text-3xl font-black text-gray-900 mb-1">{stat.value}</div>
                                <div className="text-xs md:text-sm text-gray-500 font-medium uppercase tracking-wider">{stat.label}</div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Mission Section */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInLeft}
                            >
                                <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                                    <Target className="w-4 h-4" />
                                    {t('about.mission.badge')}
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
                                    {t('about.mission.title')}
                                </h2>
                                <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                                    {t('about.mission.content1')}
                                </p>
                                <p className="text-lg text-gray-600 leading-relaxed border-l-4 border-blue-500 pl-4 bg-blue-50/50 py-3 rounded-r-lg">
                                    {t('about.mission.content2')}
                                </p>
                            </motion.div>

                            <motion.div
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                variants={fadeInRight}
                                className="relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl transform rotate-3 opacity-20 blur-sm"></div>
                                <div className="bg-gradient-to-br from-slate-900 to-blue-900 rounded-3xl p-8 md:p-10 relative shadow-2xl text-white">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/20 rounded-full blur-2xl"></div>
                                    <Globe className="w-14 h-14 text-cyan-400 mb-6" />
                                    <h3 className="text-2xl md:text-3xl font-bold mb-4">{t('about.mission.cardTitle')}</h3>
                                    <p className="text-blue-100/80 text-lg leading-relaxed mb-6">
                                        {t('about.mission.cardDescription')}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {features.slice(0, 4).map((feature, idx) => (
                                            <span key={idx} className="bg-white/10 backdrop-blur-sm text-sm px-3 py-1.5 rounded-full border border-white/20">
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>



            {/* Values Section */}
            <section className="py-16 md:py-24 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="max-w-6xl mx-auto">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                            className="text-center mb-12 md:mb-16"
                        >
                            <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">{t('about.values.title')}</h2>
                            <p className="text-lg text-gray-600 max-w-2xl mx-auto">{t('about.values.subtitle')}</p>
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={staggerContainer}
                            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
                        >
                            {values.map((value, index) => (
                                <motion.div
                                    key={index}
                                    variants={fadeInUp}
                                    className="group bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                                >
                                    <div className={`w-14 h-14 bg-gradient-to-br ${value.gradient} rounded-xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                                        <value.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                                    <p className="text-gray-600 leading-relaxed text-sm md:text-base">
                                        {value.description}
                                    </p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* SEO & Purpose Section */}
            <section className="py-16 bg-white">
                <div className="container mx-auto px-4 max-w-4xl text-center md:text-left">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                    >
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                            {t('about.seo.title')}
                        </h2>
                        <div className="prose prose-lg text-gray-600 max-w-none">
                            <p className="mb-4">
                                {t('about.seo.p1')}
                            </p>
                            <p className="mb-4">
                                {t('about.seo.p2')}
                            </p>
                            <p>
                                {t('about.seo.p3')}
                            </p>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 md:py-24 bg-white">
                <div className="container mx-auto px-4">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeInUp}
                        className="max-w-5xl mx-auto"
                    >
                        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-10 md:p-16 text-center shadow-2xl relative overflow-hidden">
                            {/* Background Effects */}
                            <div className="absolute inset-0 overflow-hidden">
                                <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                                <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
                            </div>

                            <div className="relative z-10">
                                <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
                                    {t('about.cta.title')}
                                </h2>
                                <p className="text-blue-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
                                    {t('about.cta.subtitle')}
                                </p>
                                <Link to="/register">
                                    <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 h-14 px-10 text-lg font-bold shadow-xl transition-all hover:scale-105">
                                        {t('about.cta.button')} <ArrowRight className="ml-2 w-5 h-5" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    )
}
