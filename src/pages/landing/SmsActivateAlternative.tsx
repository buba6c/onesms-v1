import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSEO } from '@/hooks/useSEO';
import { Button } from '@/components/ui/button';
import { CheckCircle, Zap, Shield, Globe } from 'lucide-react';

export default function SmsActivateAlternative() {
  const { t } = useTranslation();

  useSEO({
    titleLiteral: "Best SMS-Activate Alternative 2026 | OneSMS",
    descriptionLiteral: "Looking for an alternative to sms-activate? OneSMS offers faster delivery, cheaper prices, and better reliability for virtual numbers and SMS verification.",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "OneSMS",
      "applicationCategory": "UtilityApplication",
      "operatingSystem": "Web",
      "description": "The best alternative to sms-activate for receiving SMS online.",
      "offers": {
        "@type": "Offer",
        "price": "0.50",
        "priceCurrency": "USD"
      }
    }
  });

  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            The Ultimate <span className="text-blue-600">SMS-Activate Alternative</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get instant virtual numbers for WhatsApp, Telegram, and 1600+ services. Faster delivery, better support, and competitive pricing.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-16">
          <div className="grid md:grid-cols-2 gap-0">
            <div className="p-10 bg-gray-50 border-r border-gray-100">
              <h2 className="text-2xl font-bold text-gray-400 mb-6 flex items-center">
                <span className="line-through">SMS-Activate</span>
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start text-gray-500">
                  <span className="mr-3 text-red-400">✗</span>
                  Delayed SMS delivery
                </li>
                <li className="flex items-start text-gray-500">
                  <span className="mr-3 text-red-400">✗</span>
                  Complex pricing structure
                </li>
                <li className="flex items-start text-gray-500">
                  <span className="mr-3 text-red-400">✗</span>
                  Slow customer support
                </li>
              </ul>
            </div>
            <div className="p-10 bg-gradient-to-br from-blue-50 to-cyan-50">
              <h2 className="text-2xl font-bold text-blue-700 mb-6 flex items-center">
                <Zap className="w-6 h-6 mr-2" /> OneSMS
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start text-blue-900 font-medium">
                  <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
                  Instant SMS delivery (&lt; 3 seconds)
                </li>
                <li className="flex items-start text-blue-900 font-medium">
                  <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
                  Clear pricing in USD, EUR & CFA
                </li>
                <li className="flex items-start text-blue-900 font-medium">
                  <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
                  24/7 dedicated support
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link to="/register">
            <Button className="h-14 px-10 text-lg font-bold rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
              Start Using OneSMS Today
            </Button>
          </Link>
          <p className="mt-4 text-sm text-gray-500">Join thousands of users who have already switched.</p>
        </div>
      </div>
    </div>
  );
}
