import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Shield, 
  Users, 
  CreditCard, 
  AlertTriangle, 
  Scale,
  Clock,
  Ban,
  RefreshCw,
  Mail,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  const { t } = useTranslation();

  const sections = [
    {
      id: 'acceptance',
      icon: FileText,
      title: t('terms.sections.acceptance.title'),
      content: t('terms.sections.acceptance.content'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'services',
      icon: Shield,
      title: t('terms.sections.services.title'),
      content: t('terms.sections.services.content'),
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'registration',
      icon: Users,
      title: t('terms.sections.registration.title'),
      content: t('terms.sections.registration.content'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'payment',
      icon: CreditCard,
      title: t('terms.sections.payment.title'),
      content: t('terms.sections.payment.content'),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      id: 'refund',
      icon: RefreshCw,
      title: t('terms.sections.refund.title'),
      content: t('terms.sections.refund.content'),
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    },
    {
      id: 'prohibited',
      icon: Ban,
      title: t('terms.sections.prohibited.title'),
      content: t('terms.sections.prohibited.content'),
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      id: 'liability',
      icon: AlertTriangle,
      title: t('terms.sections.liability.title'),
      content: t('terms.sections.liability.content'),
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      id: 'termination',
      icon: Clock,
      title: t('terms.sections.termination.title'),
      content: t('terms.sections.termination.content'),
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    },
    {
      id: 'changes',
      icon: Scale,
      title: t('terms.sections.changes.title'),
      content: t('terms.sections.changes.content'),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      id: 'contact',
      icon: Mail,
      title: t('terms.sections.contact.title'),
      content: t('terms.sections.contact.content'),
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
        <div className="container mx-auto px-4 py-16">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('common.backToHome')}
          </Link>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FileText className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold">{t('terms.title')}</h1>
            </div>
            <p className="text-xl text-white/90">{t('terms.subtitle')}</p>
            <p className="mt-4 text-white/70 text-sm">
              {t('terms.lastUpdated')}: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="container mx-auto px-4 -mt-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('terms.tableOfContents')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-600 hover:text-gray-900"
              >
                <section.icon className={`w-4 h-4 ${section.color}`} />
                <span className="truncate">{section.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className={`${section.bgColor} px-6 py-4 border-b border-gray-100`}>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-bold text-lg">{String(index + 1).padStart(2, '0')}</span>
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                  <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
                </div>
              </div>
              <div className="p-6">
                <div 
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </div>
            </section>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="max-w-4xl mx-auto mt-12 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900">{t('terms.questions')}</h3>
              <p className="text-gray-600 text-sm">{t('terms.contactUs')}</p>
            </div>
            <div className="flex gap-3">
              <Link to="/contact">
                <Button variant="outline">{t('common.contactUs')}</Button>
              </Link>
              <Link to="/privacy">
                <Button>{t('terms.viewPrivacy')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
