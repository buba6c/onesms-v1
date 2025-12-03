import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Heart, MessageSquare } from 'lucide-react'

export default function Footer() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-300 border-t border-gray-700">
      <div className="container mx-auto px-4 py-10">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          
          {/* Logo & Description */}
          <div className="text-center md:text-left">
            <h3 className="text-white font-bold text-xl mb-2">{t('app.name')}</h3>
            <p className="text-sm text-gray-400 max-w-xs">{t('app.tagline')}</p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link to="/how-to-use" className="hover:text-blue-400 transition-colors duration-200">
              {t('footer.howItWorks', 'Comment Ça Marche')}
            </Link>
            <Link to="/contact" className="hover:text-blue-400 transition-colors duration-200">
              {t('footer.contact', 'Contact')}
            </Link>
          </div>

          {/* Contact Button */}
          <div>
            <Link 
              to="/contact"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-medium transition-all duration-200 hover:scale-105"
            >
              <MessageSquare className="w-4 h-4" />
              {t('footer.contactUs', 'Nous Contacter')}
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright */}
          <p className="text-sm text-gray-400">
            © {currentYear} {t('app.name')}. {t('footer.allRightsReserved', 'Tous droits réservés.')}
          </p>

          {/* Made in Senegal */}
          <p className="text-sm text-gray-500 flex items-center gap-1">
            {t('footer.madeWith', 'Fait avec')} <Heart className="w-4 h-4 text-red-500 fill-red-500" /> {t('footer.in', 'au')} {t('footer.senegal', 'Sénégal')} 🇸🇳
          </p>
        </div>
      </div>
    </footer>
  )
}
