import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from '@/locales/en.json'
import fr from '@/locales/fr.json'

const resources = {
  en: { translation: en },
  fr: { translation: fr },
}

// Détecter la langue du navigateur
const getBrowserLanguage = (): string => {
  // Vérifier d'abord si une langue est sauvegardée
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage) return savedLanguage;
  
  // Sinon détecter la langue du navigateur
  const browserLang = navigator.language || (navigator as any).userLanguage;
  
  // Si la langue commence par 'fr', utiliser FR
  if (browserLang && browserLang.toLowerCase().startsWith('fr')) {
    return 'fr';
  }
  
  // Sinon utiliser FR par défaut (au lieu de EN)
  return 'fr';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getBrowserLanguage(),
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
