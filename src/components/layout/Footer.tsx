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

          {/* Contact & Social */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Instagram Link */}
            <a
              href="https://instagram.com/onesms.sn"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 text-gray-300 hover:text-pink-400 transition-colors duration-200"
              aria-label="Instagram"
            >
              <div className="w-9 h-9 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <span className="text-sm font-medium hidden sm:inline">@onesms.sn</span>
            </a>

            {/* Contact Button */}
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
        <div className="flex flex-col md:flex-row justify-center items-center gap-4">
          {/* Copyright */}
          <p className="text-sm text-gray-400">
            © {currentYear} {t('app.name')}. {t('footer.allRightsReserved', 'Tous droits réservés.')}
          </p>
        </div>
      </div>
    </footer>
  )
}
