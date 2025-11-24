import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export default function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="bg-gray-50 border-t mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-4">{t('app.name')}</h3>
            <p className="text-sm text-gray-600">{t('app.tagline')}</p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer.about')}</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/about" className="hover:text-primary">{t('footer.about')}</Link></li>
              <li><Link to="/contact" className="hover:text-primary">{t('footer.contact')}</Link></li>
              <li><Link to="/faq" className="hover:text-primary">{t('footer.faq')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('footer.support')}</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/support" className="hover:text-primary">{t('footer.support')}</Link></li>
              <li><Link to="/terms" className="hover:text-primary">{t('footer.terms')}</Link></li>
              <li><Link to="/privacy" className="hover:text-primary">{t('footer.privacy')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <p className="text-sm text-gray-600">support@onesms.com</p>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
          <p>{t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  )
}
