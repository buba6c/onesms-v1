import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Database, 
  Eye, 
  Lock, 
  Share2, 
  Cookie,
  UserCheck,
  Trash2,
  Globe,
  Mail,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  const { t } = useTranslation();

  const sections = [
    {
      id: 'introduction',
      icon: Shield,
      title: t('privacy.sections.introduction.title'),
      content: t('privacy.sections.introduction.content'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'dataCollection',
      icon: Database,
      title: t('privacy.sections.dataCollection.title'),
      content: t('privacy.sections.dataCollection.content'),
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'dataUsage',
      icon: Eye,
      title: t('privacy.sections.dataUsage.title'),
      content: t('privacy.sections.dataUsage.content'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'dataSecurity',
      icon: Lock,
      title: t('privacy.sections.dataSecurity.title'),
      content: t('privacy.sections.dataSecurity.content'),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      id: 'dataSharing',
      icon: Share2,
      title: t('privacy.sections.dataSharing.title'),
      content: t('privacy.sections.dataSharing.content'),
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    },
    {
      id: 'cookies',
      icon: Cookie,
      title: t('privacy.sections.cookies.title'),
      content: t('privacy.sections.cookies.content'),
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      id: 'userRights',
      icon: UserCheck,
      title: t('privacy.sections.userRights.title'),
      content: t('privacy.sections.userRights.content'),
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      id: 'dataRetention',
      icon: Trash2,
      title: t('privacy.sections.dataRetention.title'),
      content: t('privacy.sections.dataRetention.content'),
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    {
      id: 'international',
      icon: Globe,
      title: t('privacy.sections.international.title'),
      content: t('privacy.sections.international.content'),
      color: 'text-teal-600',
      bgColor: 'bg-teal-50'
    },
    {
      id: 'contact',
      icon: Mail,
      title: t('privacy.sections.contact.title'),
      content: t('privacy.sections.contact.content'),
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    }
  ];

  const dataTypes = [
    { icon: Mail, label: t('privacy.dataTypes.email') },
    { icon: Globe, label: t('privacy.dataTypes.ip') },
    { icon: Database, label: t('privacy.dataTypes.transactions') },
    { icon: Eye, label: t('privacy.dataTypes.usage') }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-500 text-white">
        <div className="container mx-auto px-4 py-16">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('common.backToHome')}
          </Link>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Shield className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold">{t('privacy.title')}</h1>
            </div>
            <p className="text-xl text-white/90">{t('privacy.subtitle')}</p>
            <p className="mt-4 text-white/70 text-sm">
              {t('privacy.lastUpdated')}: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Data Types Overview */}
      <div className="container mx-auto px-4 -mt-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('privacy.dataWeCollect')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {dataTypes.map((type, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <type.icon className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{type.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="container mx-auto px-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('privacy.tableOfContents')}</h2>
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

        {/* Your Rights Summary */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100 p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {t('privacy.yourRightsSummary')}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{t('privacy.rights.access')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{t('privacy.rights.correction')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{t('privacy.rights.deletion')}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{t('privacy.rights.portability')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="max-w-4xl mx-auto mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-gray-900">{t('privacy.questions')}</h3>
              <p className="text-gray-600 text-sm">{t('privacy.contactUs')}</p>
            </div>
            <div className="flex gap-3">
              <Link to="/contact">
                <Button variant="outline">{t('common.contactUs')}</Button>
              </Link>
              <Link to="/terms">
                <Button>{t('privacy.viewTerms')}</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
