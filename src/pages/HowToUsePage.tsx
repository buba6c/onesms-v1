import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  Wallet,
  Search,
  Globe,
  MessageSquare,
  Copy,
  CheckCircle,
  ArrowRight,
  Smartphone,
  Shield,
  Zap,
  Clock,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

export default function HowToUsePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const steps = [
    {
      number: '01',
      icon: UserPlus,
      title: t('howToUse.step1.title'),
      description: t('howToUse.step1.description'),
      gradient: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      tipBorder: 'border-blue-100',
      tipIconColor: 'text-blue-500',
      tipTextColor: 'text-blue-700',
      tips: [
        t('howToUse.step1.tip1'),
        t('howToUse.step1.tip2'),
      ]
    },
    {
      number: '02',
      icon: Wallet,
      title: t('howToUse.step2.title'),
      description: t('howToUse.step2.description'),
      gradient: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      tipBorder: 'border-green-100',
      tipIconColor: 'text-green-500',
      tipTextColor: 'text-green-700',
      tips: [
        t('howToUse.step2.tip1'),
        t('howToUse.step2.tip2'),
      ]
    },
    {
      number: '03',
      icon: Search,
      title: t('howToUse.step3.title'),
      description: t('howToUse.step3.description'),
      gradient: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      tipBorder: 'border-purple-100',
      tipIconColor: 'text-purple-500',
      tipTextColor: 'text-purple-700',
      tips: [
        t('howToUse.step3.tip1'),
        t('howToUse.step3.tip2'),
      ]
    },
    {
      number: '04',
      icon: Globe,
      title: t('howToUse.step4.title'),
      description: t('howToUse.step4.description'),
      gradient: 'from-orange-500 to-amber-600',
      bgColor: 'bg-orange-50',
      tipBorder: 'border-orange-100',
      tipIconColor: 'text-orange-500',
      tipTextColor: 'text-orange-700',
      tips: [
        t('howToUse.step4.tip1'),
        t('howToUse.step4.tip2'),
      ]
    },
    {
      number: '05',
      icon: MessageSquare,
      title: t('howToUse.step5.title'),
      description: t('howToUse.step5.description'),
      gradient: 'from-cyan-500 to-teal-600',
      bgColor: 'bg-cyan-50',
      tipBorder: 'border-cyan-100',
      tipIconColor: 'text-cyan-500',
      tipTextColor: 'text-cyan-700',
      tips: [
        t('howToUse.step5.tip1'),
        t('howToUse.step5.tip2'),
      ]
    },
    {
      number: '06',
      icon: Copy,
      title: t('howToUse.step6.title'),
      description: t('howToUse.step6.description'),
      gradient: 'from-pink-500 to-rose-600',
      bgColor: 'bg-pink-50',
      tipBorder: 'border-pink-100',
      tipIconColor: 'text-pink-500',
      tipTextColor: 'text-pink-700',
      tips: [
        t('howToUse.step6.tip1'),
        t('howToUse.step6.tip2'),
      ]
    },
  ];

  const features = [
    {
      icon: Shield,
      title: t('howToUse.features.security.title'),
      description: t('howToUse.features.security.description'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: Zap,
      title: t('howToUse.features.speed.title'),
      description: t('howToUse.features.speed.description'),
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      icon: RefreshCw,
      title: t('howToUse.features.refund.title'),
      description: t('howToUse.features.refund.description'),
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      icon: Clock,
      title: t('howToUse.features.availability.title'),
      description: t('howToUse.features.availability.description'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl"></div>

        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Smartphone className="w-4 h-4" />
              {t('howToUse.badge')}
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t('howToUse.title')}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mt-2">
                {t('howToUse.subtitle')}
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {t('howToUse.description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-blue-500/25">
                    {t('howToUse.goToDashboard')}
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-blue-500/25">
                      {t('howToUse.getStarted')}
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="px-8 py-6 text-lg rounded-xl border-2">
                      {t('howToUse.login')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section - Timeline Design */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              {t('howToUse.stepsTitle')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('howToUse.stepsDescription')}
            </p>
          </div>

          <div className="relative">
            {/* Vertical Line (Mobile & Desktop Central) */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gray-100 transform md:-translate-x-1/2 rounded-full"></div>

            <div className="space-y-12 md:space-y-24">
              {steps.map((step, index) => (
                <div key={index} className={`relative flex flex-col md:flex-row items-center ${index % 2 === 0 ? 'md:flex-row-reverse' : ''}`}>

                  {/* Step Number Badge (Center Line) */}
                  <div className="absolute left-8 md:left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full border-4 border-white shadow-xl z-20 flex items-center justify-center bg-gradient-to-br from-white to-gray-50">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.gradient} flex items-center justify-center text-white font-bold text-xl`}>
                      {step.number}
                    </div>
                  </div>

                  {/* Content Card Side */}
                  <div className="w-full md:w-1/2 pl-24 md:pl-0 md:px-12">
                    <div className={`group relative bg-white rounded-3xl p-6 md:p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden ${index % 2 === 0 ? 'md:text-left' : 'md:text-left'}`}>
                      {/* Decorative Gradient Blob */}
                      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${step.gradient} opacity-5 rounded-bl-full group-hover:scale-150 transition-transform duration-500`}></div>

                      <div className="relative z-10">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mb-6 shadow-md shadow-gray-200`}>
                          <step.icon className="w-7 h-7 text-white" />
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-3">{step.title}</h3>
                        <p className="text-gray-600 mb-6 leading-relaxed">{step.description}</p>

                        {/* Tips Box - Modernized */}
                        <div className={`${step.bgColor} rounded-xl p-4 border ${step.tipBorder}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1 bg-white rounded-full shadow-sm">
                              <Zap className={`w-3 h-3 ${step.tipIconColor}`} />
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${step.tipTextColor}`}>{t('howToUse.tips')}</span>
                          </div>
                          <ul className="space-y-2">
                            {step.tips.map((tip, tipIndex) => (
                              <li key={tipIndex} className="flex items-start gap-3 text-sm text-gray-700">
                                <CheckCircle className={`w-4 h-4 ${step.tipIconColor} flex-shrink-0 mt-0.5`} />
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Empty Side for Desktop Balance */}
                  <div className="hidden md:block w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t('howToUse.featuresTitle')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('howToUse.featuresDescription')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white border-2 border-gray-100 rounded-2xl p-6 hover:border-blue-200 hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`w-14 h-14 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Visual Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {t('howToUse.faqTitle')}
              </h2>
            </div>

            <div className="grid gap-6">
              {/* Visual Guide Cards */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl p-8 text-white">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <CreditCard className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3">{t('howToUse.faq1.title')}</h3>
                    <p className="text-blue-100 text-lg">{t('howToUse.faq1.answer')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-8 text-white">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <RefreshCw className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3">{t('howToUse.faq2.title')}</h3>
                    <p className="text-green-100 text-lg">{t('howToUse.faq2.answer')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-3xl p-8 text-white">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                      <Clock className="w-16 h-16 text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-3">{t('howToUse.faq3.title')}</h3>
                    <p className="text-orange-100 text-lg">{t('howToUse.faq3.answer')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl p-12 text-center text-white shadow-2xl shadow-blue-500/25">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('howToUse.ctaTitle')}
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              {t('howToUse.ctaDescription')}
            </p>
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg rounded-xl shadow-lg">
                  {t('howToUse.goToDashboard')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-6 text-lg rounded-xl shadow-lg">
                  {t('howToUse.createAccount')}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
