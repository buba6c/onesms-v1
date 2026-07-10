import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  ChevronDown, 
  ChevronUp,
  MessageCircle,
  Mail,
  CreditCard,
  Smartphone,
  Wallet,
  RefreshCw,
  Shield,
  Clock,
  HelpCircle,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Zap,
  ArrowRight,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { contactSettingsApi } from '@/lib/api/contactSettings';
import { contactMessagesApi } from '@/lib/api/contactMessages';

// Types
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}
type Language = 'fr' | 'en';

// Catégories FAQ
const categoriesByLang: Record<Language, Category[]> = {
  fr: [
    { 
      id: 'payment', 
      name: 'Paiement & Recharge', 
      icon: <CreditCard className="h-5 w-5" />,
      color: 'text-emerald-500',
      gradient: 'from-emerald-500 to-green-400'
    },
    { 
      id: 'numbers', 
      name: 'Numéros & SMS', 
      icon: <Smartphone className="h-5 w-5" />,
      color: 'text-blue-500',
      gradient: 'from-blue-500 to-cyan-400'
    },
    { 
      id: 'balance', 
      name: 'Solde & Remboursement', 
      icon: <Wallet className="h-5 w-5" />,
      color: 'text-amber-500',
      gradient: 'from-amber-500 to-orange-400'
    },
    { 
      id: 'rental', 
      name: 'Location de Numéros', 
      icon: <RefreshCw className="h-5 w-5" />,
      color: 'text-purple-500',
      gradient: 'from-purple-500 to-pink-400'
    },
    { 
      id: 'account', 
      name: 'Compte & Sécurité', 
      icon: <Shield className="h-5 w-5" />,
      color: 'text-rose-500',
      gradient: 'from-rose-500 to-red-400'
    },
  ],
  en: [
    { 
      id: 'payment', 
      name: 'Payment & Top-up', 
      icon: <CreditCard className="h-5 w-5" />,
      color: 'text-emerald-500',
      gradient: 'from-emerald-500 to-green-400'
    },
    { 
      id: 'numbers', 
      name: 'Numbers & SMS', 
      icon: <Smartphone className="h-5 w-5" />,
      color: 'text-blue-500',
      gradient: 'from-blue-500 to-cyan-400'
    },
    { 
      id: 'balance', 
      name: 'Balance & Refunds', 
      icon: <Wallet className="h-5 w-5" />,
      color: 'text-amber-500',
      gradient: 'from-amber-500 to-orange-400'
    },
    { 
      id: 'rental', 
      name: 'Number Rentals', 
      icon: <RefreshCw className="h-5 w-5" />,
      color: 'text-purple-500',
      gradient: 'from-purple-500 to-pink-400'
    },
    { 
      id: 'account', 
      name: 'Account & Security', 
      icon: <Shield className="h-5 w-5" />,
      color: 'text-rose-500',
      gradient: 'from-rose-500 to-red-400'
    },
  ],
};

const faqDataByLang: Record<Language, FAQItem[]> = {
  fr: [
    // 💳 PAIEMENT & RECHARGE
    {
      id: 'payment-1',
      category: 'payment',
      question: 'Comment recharger mon compte One SMS ?',
      answer: `Pour recharger votre compte :\n\n1. Connectez-vous à votre compte One SMS\n2. Cliquez sur "Recharger" dans le menu\n3. Choisissez un pack de recharge\n4. Sélectionnez votre moyen de paiement (Orange Money, Wave, carte bancaire)\n5. Confirmez le paiement\n\nVotre solde sera crédité instantanément.`
    },
    {
      id: 'payment-2',
      category: 'payment',
      question: 'Quels sont les moyens de paiement acceptés ?',
      answer: `One SMS accepte plusieurs moyens de paiement :\n\n• **Mobile Money** : Orange Money, Wave, Free Money\n• **Cartes bancaires** : Visa, Mastercard\n• **Paiement en ligne** : PayTech`
    },
    {
      id: 'payment-3',
      category: 'payment',
      question: 'Mon paiement a été débité mais mon solde n\'a pas été crédité ?',
      answer: `Si votre paiement a été débité mais que votre solde n'est pas crédité :\n\n1. **Patientez quelques minutes** - Parfois le crédit peut prendre 1-5 minutes\n2. **Rafraîchissez la page**\n3. **Vérifiez votre historique**\n\nSi après 15 minutes le problème persiste, contactez notre support.`
    },
    // 📱 NUMÉROS & SMS
    {
      id: 'numbers-1',
      category: 'numbers',
      question: 'Comment obtenir un numéro virtuel ?',
      answer: `Pour obtenir un numéro virtuel :\n\n1. Depuis le Dashboard, sélectionnez le service\n2. Choisissez le pays\n3. Cliquez sur "Acheter"\n4. Le montant sera déduit de votre solde\n5. Votre numéro apparaît immédiatement dans la section "Numéros actifs"`
    },
    {
      id: 'numbers-2',
      category: 'numbers',
      question: 'Combien de temps mon numéro reste-t-il actif ?',
      answer: `La durée d'activation dépend du type d'achat :\n\n• **Activation simple** : Le numéro reste actif **20 minutes** pour recevoir le SMS\n• **Location** : Durée variable selon votre choix (4h, 24h, 7 jours, 30 jours)`
    },
    // 💰 SOLDE & REMBOURSEMENT
    {
      id: 'balance-1',
      category: 'balance',
      question: 'Qu\'est-ce que le solde gelé (frozen) ?',
      answer: `Le **solde gelé** est une mesure de sécurité :\n\nQuand vous achetez un numéro, le montant est temporairement "gelé". \n\n• Si vous recevez le SMS → Le montant gelé est définitivement débité\n• Si vous n'avez pas reçu de SMS → Le montant gelé est automatiquement remboursé`
    },
    // 🔄 LOCATION DE NUMÉROS
    {
      id: 'rental-1',
      category: 'rental',
      question: 'Quelle est la différence entre activation et location ?',
      answer: `**Activation simple** :\n• Usage unique pour un seul service\n• Durée : 20 minutes maximum\n\n**Location** :\n• Usage multiple pour plusieurs services\n• Durée : 4h, 24h, 7 jours ou 30 jours\n• Vous gardez le même numéro`
    },
    // 🔐 COMPTE & SÉCURITÉ
    {
      id: 'account-1',
      category: 'account',
      question: 'Comment créer un compte One SMS ?',
      answer: `Créer un compte est simple et gratuit :\n\n1. Cliquez sur "S'inscrire"\n2. Entrez votre adresse email\n3. Créez un mot de passe\n4. Confirmez votre email\n5. Connectez-vous et rechargez !`
    },
  ],
  en: [
    {
      id: 'payment-1',
      category: 'payment',
      question: 'How do I top up my One SMS account?',
      answer: `To add credit to your account:\n\n1. Sign in to One SMS\n2. Click "Top up" in the menu\n3. Pick a pack\n4. Choose a payment method\n5. Confirm the payment\n\nYour balance is credited instantly.`
    },
    {
      id: 'numbers-1',
      category: 'numbers',
      question: 'How do I get a virtual number?',
      answer: `To get a virtual number:\n\n1. Select the service\n2. Choose the country\n3. Click "Buy"\n4. The amount is deducted\n5. Your number appears instantly`
    },
    {
      id: 'balance-1',
      category: 'balance',
      question: 'What is frozen balance?',
      answer: `Frozen balance is a safety measure:\n\nWhen you buy a number, the amount is temporarily frozen. \n\n• If you receive the SMS → frozen amount is captured\n• If no SMS arrives → frozen amount is refunded`
    },
    {
      id: 'rental-1',
      category: 'rental',
      question: 'What is the difference between activation and rental?',
      answer: `**Single activation**:\n• One-time use\n• 20 minutes max\n\n**Rental**:\n• Multiple services\n• 4h, 24h, 7 days, or 30 days`
    },
    {
      id: 'account-1',
      category: 'account',
      question: 'How do I create a One SMS account?',
      answer: `It's simple and free:\n\n1. Click "Sign up"\n2. Enter email\n3. Create password\n4. Confirm email\n5. Sign in!`
    },
  ],
};

const uiText: Record<Language, {
  searchPlaceholder: string;
  allLabel: string;
  noResult: string;
  noResultHint: string;
}> = {
  fr: {
    searchPlaceholder: 'Rechercher une question...',
    allLabel: 'Toutes',
    noResult: 'Aucune question trouvée pour',
    noResultHint: 'Essayez avec d\'autres mots-clés ou contactez-nous',
  },
  en: {
    searchPlaceholder: 'Search a question...',
    allLabel: 'All',
    noResult: 'No question found for',
    noResultHint: 'Try other keywords or contact us',
  },
};

export default function SupportPage() {
  const { user } = useAuthStore();
  const { i18n, t } = useTranslation();
  const currentLang: Language = i18n.language?.startsWith('en') ? 'en' : 'fr';

  const { data: contactSettings } = useQuery({
    queryKey: ['contact-settings'],
    queryFn: contactSettingsApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>('payment');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    website: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const text = uiText[currentLang];
  const categories = categoriesByLang[currentLang];
  const faqData = faqDataByLang[currentLang];

  // Filtrer les FAQ
  const filteredFAQs = useMemo(() => {
    return faqData.filter(faq => {
      const matchesSearch = searchQuery === '' || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === null || faq.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, faqData]);

  // Toggle FAQ
  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  // Soumettre le formulaire de contact
  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const userName = `${contactForm.firstName} ${contactForm.lastName}`.trim() || user?.full_name || 'Utilisateur';
    const userEmail = contactForm.email || user?.email || '';
    const subject = `Support Ticket from ${userName}`;
    const fullMessage = `Phone: ${contactForm.phone}\nWebsite: ${contactForm.website}\n\nMessage:\n${contactForm.message}`;

    // Submit contact form to database
    const result = await contactMessagesApi.submitContactForm({
      name: userName,
      email: userEmail,
      subject: subject,
      message: fullMessage,
    });

    setIsSubmitting(false);

    if (result.success) {
      setSubmitSuccess(true);
      setContactForm({ firstName: '', lastName: '', phone: '', website: '', message: '', email: user?.email || '' });
      setTimeout(() => setSubmitSuccess(false), 5000);
    } else {
      console.error('Error submitting contact form:', result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFE]">
      {/* Background Effects (Light, Soft Gradient) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-blue-50 to-cyan-50 rounded-full blur-[120px] opacity-70 translate-x-1/3 -translate-y-1/4"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-50 to-indigo-50 rounded-full blur-[100px] opacity-70 -translate-x-1/4 translate-y-1/4"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        
        {/* Contact / Help Section */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
          
          {/* Left Column - Content */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="pt-4"
          >
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-bold text-slate-900 leading-[1.1] tracking-tight mb-6 font-display">
              {currentLang === 'fr' ? 'Comment pouvons-nous vous aider ?' : 'How can We Help?'}
            </h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed max-w-lg">
              {currentLang === 'fr' 
                ? 'Contactez nos équipes de vente et de support pour des démonstrations, de l\'aide à l\'intégration ou des questions sur nos produits.'
                : 'Get in touch with our sales and support teams for demos, onboarding support, or product questions.'}
            </p>

            <ul className="space-y-4 mb-12">
              {[
                currentLang === 'fr' ? 'Demander une démonstration' : 'Request a demo',
                currentLang === 'fr' ? 'Découvrir le forfait adapté à votre équipe' : 'Learn which plan is right for your team',
                currentLang === 'fr' ? 'Obtenir de l\'aide pour l\'intégration' : 'Get onboarding help'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <span className="text-slate-700 font-medium">{item}</span>
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-slate-900 font-semibold mb-2">
                  {currentLang === 'fr' ? 'Communication générale' : 'General communication'}
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  {currentLang === 'fr' 
                    ? 'Pour d\'autres questions, contactez-nous par email.'
                    : 'For other queries, please get in touch with us via email.'}
                </p>
                <a href="mailto:support@onesms-sn.com" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors">
                  <Mail className="w-4 h-4" />
                  support@onesms-sn.com
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
              <h2 className="text-2xl font-bold text-slate-900 mb-8 font-display">
                {currentLang === 'fr' ? 'Contacter notre équipe' : 'Contact our sales team'}
              </h2>

              {submitSuccess ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-6">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {currentLang === 'fr' ? 'Message envoyé !' : 'Message sent!'}
                  </h3>
                  <p className="text-slate-500">
                    {currentLang === 'fr' 
                      ? 'Nous vous répondrons dans les plus brefs délais.'
                      : 'We will get back to you as soon as possible.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitContact} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        {currentLang === 'fr' ? 'Prénom' : 'First name'}
                      </label>
                      <Input
                        required
                        value={contactForm.firstName}
                        onChange={(e) => setContactForm({...contactForm, firstName: e.target.value})}
                        className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-blue-500"
                        placeholder="John"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        {currentLang === 'fr' ? 'Nom' : 'Last name'}
                      </label>
                      <Input
                        required
                        value={contactForm.lastName}
                        onChange={(e) => setContactForm({...contactForm, lastName: e.target.value})}
                        className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-blue-500"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {currentLang === 'fr' ? 'Adresse email' : 'Email address'}
                    </label>
                    <Input
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                      className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-blue-500"
                      placeholder="contact@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {currentLang === 'fr' ? 'Numéro de téléphone' : 'Phone number'}
                    </label>
                    <Input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                      className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-blue-500"
                      placeholder="+221 77 123 45 67"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {currentLang === 'fr' ? 'Site web (optionnel)' : 'Company website'}
                    </label>
                    <Input
                      type="url"
                      value={contactForm.website}
                      onChange={(e) => setContactForm({...contactForm, website: e.target.value})}
                      className="bg-slate-50 border-slate-200 h-12 rounded-xl focus-visible:ring-blue-500"
                      placeholder="https://votre-site.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      {currentLang === 'fr' ? 'Votre message' : 'Your message'}
                    </label>
                    <Textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      className="bg-slate-50 border-slate-200 rounded-xl resize-none focus-visible:ring-blue-500 p-4"
                      placeholder={currentLang === 'fr' ? 'Parlez-nous de votre projet...' : 'Tell us more about your project...'}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 bg-[#1E293B] hover:bg-slate-800 text-white rounded-xl font-semibold text-lg transition-colors"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      currentLang === 'fr' ? 'Envoyer le message' : 'Send Message'
                    )}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200 w-full max-w-6xl mx-auto my-24"></div>

        {/* FAQ Section Adaptée au Light Theme */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 font-display">
              {currentLang === 'fr' ? 'Questions Fréquentes' : 'Frequently Asked Questions'}
            </h2>
            <p className="text-slate-500">
              {currentLang === 'fr' 
                ? 'Consultez notre base de connaissances pour trouver des réponses rapides.'
                : 'Browse our knowledge base to find quick answers.'}
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder={text.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl text-lg focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-10">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`relative px-5 py-2.5 rounded-xl font-medium transition-colors duration-300 ${
                selectedCategory === null ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {selectedCategory === null && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute inset-0 bg-white border border-slate-200 shadow-sm rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{text.allLabel}</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors duration-300 ${
                  selectedCategory === cat.id ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {selectedCategory === cat.id && (
                  <motion.div
                    layoutId="activeCategory"
                    className={`absolute inset-0 bg-gradient-to-r ${cat.gradient} rounded-xl shadow-sm`}
                    initial={false}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <span className={selectedCategory === cat.id ? 'text-white' : cat.color}>{cat.icon}</span>
                  <span className="hidden sm:inline">{cat.name}</span>
                </span>
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="mb-20">
            {filteredFAQs.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">{text.noResult} "{searchQuery}"</p>
                <p className="text-slate-400 mt-2">{text.noResultHint}</p>
              </div>
            ) : (
              <motion.div layout className="space-y-3">
                <AnimatePresence initial={false}>
                  {filteredFAQs.map(faq => {
                    const category = categories.find(c => c.id === faq.category);
                    const isExpanded = expandedFAQ === faq.id;
                    
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        key={faq.id}
                        className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                          isExpanded 
                            ? 'bg-white border border-blue-100 shadow-md' 
                            : 'bg-white border border-slate-100 hover:border-slate-300 shadow-sm'
                        }`}
                      >
                        <button
                          onClick={() => toggleFAQ(faq.id)}
                          className="w-full flex items-center gap-4 p-5 text-left"
                        >
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category?.gradient} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                            <span className="text-white drop-shadow-sm">{category?.icon}</span>
                          </div>
                          <span className="flex-1 text-slate-800 font-medium text-lg pr-4">{faq.question}</span>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isExpanded ? 'bg-slate-100' : 'bg-slate-50'}`}
                          >
                            <ChevronDown className={`h-4 w-4 ${isExpanded ? 'text-slate-700' : 'text-slate-400'}`} />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <div className="px-5 pb-6 pt-0">
                                <div className="pl-14 text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-4 mt-2">
                                  {faq.answer}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
