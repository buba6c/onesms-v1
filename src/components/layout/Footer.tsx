import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MessageSquare, ArrowUpRight } from 'lucide-react'

export default function Footer() {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative bg-[#020817] border-t border-white/10">
      {/* Subtle decorative gradient at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />

      <div className="container mx-auto px-4 py-10">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">

          {/* Logo & Description */}
          <div className="text-center md:text-left">
            <h3 className="text-white font-bold text-xl mb-1">{t('app.name')}</h3>
            <p className="text-sm text-slate-400 max-w-xs">{t('app.tagline')}</p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-slate-300">
            <Link to="/about" className="hover:text-blue-400 transition-colors duration-200">
              {t('footer.aboutUs', 'À Propos de Nous')}
            </Link>
            <Link to="/how-to-use" className="hover:text-blue-400 transition-colors duration-200">
              {t('footer.howItWorks', 'Comment Ça Marche')}
            </Link>
            <Link to="/contact" className="hover:text-blue-400 transition-colors duration-200">
              {t('footer.contact', 'Nous Contacter')}
            </Link>
            <Link to="/terms" className="hover:text-blue-400 transition-colors duration-200">
              {t('footer.terms', "Conditions d'utilisation")}
            </Link>
            <Link to="/privacy" className="hover:text-blue-400 transition-colors duration-200">
              {t('footer.privacy', 'Politique de Confidentialité')}
            </Link>
            <Link to="/api-docs" className="hover:text-emerald-400 text-emerald-500/80 transition-colors duration-200 font-medium cursor-pointer" target="_blank" rel="noopener noreferrer">
              API
            </Link>
          </div>

          {/* Contact & Social */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex flex-row gap-2.5">
              {/* Instagram */}
              <a
                href="https://www.instagram.com/onesms.sn?igsh=ZXl1c3RiNGFtOGZz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 transition-all duration-200 group"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path>
                </svg>
              </a>
            </div>

            {/* Contact Button */}
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/30 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageSquare className="w-4 h-4" />
              {t('footer.contactUs', 'Nous Contacter')}
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
            </Link>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-center items-center gap-3">
          <p className="text-sm text-slate-500">
            © {currentYear} {t('app.name')}. {t('footer.allRightsReserved', 'Tous droits réservés.')}
          </p>
          <span className="hidden md:inline text-slate-700">•</span>
          <p className="text-xs text-slate-600">
            {t('footer.companyInfo', 'OneSMS is operated by Wolof Digital LLC, a Wyoming registered company.')}
          </p>
        </div>
      </div>
    </footer>
  )
}
