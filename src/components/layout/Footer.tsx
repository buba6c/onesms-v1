import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Mail, Facebook, Twitter, Instagram, Linkedin, Youtube, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { toast } from 'sonner'

export default function Footer() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      toast.success(t('common.success'), {
        description: 'Thank you for subscribing!'
      })
      setEmail('')
    }
  }

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300 border-t border-gray-700">
      <div className="container mx-auto px-4 py-16">
        {/* Top Section - 4 Columns + Newsletter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Column 1: About */}
          <div className="lg:col-span-1">
            <h3 className="text-white font-bold text-xl mb-4">{t('app.name')}</h3>
            <p className="text-sm text-gray-400 mb-4">{t('app.tagline')}</p>
            <p className="text-xs text-gray-500">{t('footer.trustedBy')}</p>
          </div>

          {/* Column 2: Company */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t('footer.company')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/about" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.aboutUs')}
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.howItWorks')}
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.blog')}
                </Link>
              </li>
              <li>
                <Link to="/careers" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.careers')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t('footer.support')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/help" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.helpCenter')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.contact')}
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.faq')}
                </Link>
              </li>
              <li>
                <Link to="/api-docs" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.apiDocs')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t('footer.legal')}</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/terms" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/refund" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.refund')}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-blue-400 transition-colors duration-200">
                  {t('footer.cookies')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Newsletter */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">{t('footer.newsletter')}</h4>
            <p className="text-sm text-gray-400 mb-4">{t('footer.newsletterDesc')}</p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-3">
              <Input
                type="email"
                placeholder={t('footer.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
                required
              />
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 w-full">
                <Mail className="w-4 h-4 mr-2" />
                {t('footer.subscribe')}
              </Button>
            </form>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 mb-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
          {/* Left: Copyright */}
          <div className="flex flex-col items-center lg:items-start gap-2">
            <p className="text-sm text-gray-400">{t('footer.copyright')}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              {t('footer.madeWith')} <Heart className="w-3 h-3 text-red-500 fill-red-500" /> {t('footer.in')} {t('footer.senegal')} 🇸🇳
            </p>
          </div>

          {/* Center: Social Links */}
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-400 mr-2">{t('footer.followUs')}:</p>
            <a 
              href="https://facebook.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a 
              href="https://twitter.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-blue-400 flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-pink-600 flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-blue-700 flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <Linkedin className="w-5 h-5" />
            </a>
            <a 
              href="https://youtube.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-gray-800 hover:bg-red-600 flex items-center justify-center transition-all duration-200 hover:scale-110"
            >
              <Youtube className="w-5 h-5" />
            </a>
          </div>

          {/* Right: Payment Methods & Security */}
          <div className="flex flex-col items-center lg:items-end gap-3">
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">{t('footer.paymentMethods')}:</p>
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 bg-white rounded text-xs font-semibold text-gray-900">VISA</div>
                <div className="px-2 py-1 bg-blue-600 rounded text-xs font-semibold text-white">PayPal</div>
                <div className="px-2 py-1 bg-orange-500 rounded text-xs font-semibold text-white">₿</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {t('footer.secured')}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
