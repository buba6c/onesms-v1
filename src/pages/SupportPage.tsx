import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

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

// Catégories FAQ
const categories: Category[] = [
  { 
    id: 'payment', 
    name: 'Paiement & Recharge', 
    icon: <CreditCard className="h-5 w-5" />,
    color: 'text-emerald-400',
    gradient: 'from-emerald-500 to-green-400'
  },
  { 
    id: 'numbers', 
    name: 'Numéros & SMS', 
    icon: <Smartphone className="h-5 w-5" />,
    color: 'text-blue-400',
    gradient: 'from-blue-500 to-cyan-400'
  },
  { 
    id: 'balance', 
    name: 'Solde & Remboursement', 
    icon: <Wallet className="h-5 w-5" />,
    color: 'text-amber-400',
    gradient: 'from-amber-500 to-orange-400'
  },
  { 
    id: 'rental', 
    name: 'Location de Numéros', 
    icon: <RefreshCw className="h-5 w-5" />,
    color: 'text-purple-400',
    gradient: 'from-purple-500 to-pink-400'
  },
  { 
    id: 'account', 
    name: 'Compte & Sécurité', 
    icon: <Shield className="h-5 w-5" />,
    color: 'text-rose-400',
    gradient: 'from-rose-500 to-red-400'
  },
];

// FAQ complète basée sur One SMS
const faqData: FAQItem[] = [
  // 💳 PAIEMENT & RECHARGE
  {
    id: 'payment-1',
    category: 'payment',
    question: 'Comment recharger mon compte One SMS ?',
    answer: `Pour recharger votre compte :

1. Connectez-vous à votre compte One SMS
2. Cliquez sur "Recharger" dans le menu ou sur le bouton de recharge
3. Choisissez un pack de recharge (1000 FCFA, 2000 FCFA, 5000 FCFA, etc.)
4. Sélectionnez votre moyen de paiement (Orange Money, Wave, Free Money, carte bancaire)
5. Confirmez le paiement

Votre solde sera crédité instantanément après confirmation du paiement.`
  },
  {
    id: 'payment-2',
    category: 'payment',
    question: 'Quels sont les moyens de paiement acceptés ?',
    answer: `One SMS accepte plusieurs moyens de paiement :

• **Mobile Money** : Orange Money, Wave, Free Money
• **Cartes bancaires** : Visa, Mastercard
• **Paiement en ligne** : PayTech

Les paiements sont sécurisés et le crédit est ajouté instantanément à votre compte.`
  },
  {
    id: 'payment-3',
    category: 'payment',
    question: 'Mon paiement a été débité mais mon solde n\'a pas été crédité ?',
    answer: `Si votre paiement a été débité mais que votre solde n'est pas crédité :

1. **Patientez quelques minutes** - Parfois le crédit peut prendre 1-5 minutes
2. **Rafraîchissez la page** - Votre solde peut ne pas s'être actualisé
3. **Vérifiez votre historique** - Allez dans Historique pour voir si la transaction apparaît

Si après 15 minutes le problème persiste, contactez notre support avec :
• Votre email de compte
• Le montant payé
• La preuve de paiement (capture d'écran)`
  },
  {
    id: 'payment-4',
    category: 'payment',
    question: 'Y a-t-il un montant minimum de recharge ?',
    answer: `Le montant minimum de recharge dépend du pack choisi. Nos packs commencent généralement à partir de **500 FCFA**.

Plus le pack est important, plus vous bénéficiez d'un meilleur taux. Consultez la page Recharge pour voir tous les packs disponibles et leurs bonus.`
  },

  // 📱 NUMÉROS & SMS
  {
    id: 'numbers-1',
    category: 'numbers',
    question: 'Comment obtenir un numéro virtuel ?',
    answer: `Pour obtenir un numéro virtuel :

1. Depuis le Dashboard, sélectionnez le **service** (WhatsApp, Telegram, Google, etc.)
2. Choisissez le **pays** du numéro souhaité
3. Cliquez sur **"Acheter"** ou **"Obtenir le numéro"**
4. Le montant sera déduit de votre solde
5. Votre numéro apparaît immédiatement dans la section "Numéros actifs"

Utilisez ce numéro pour recevoir votre code de vérification SMS.`
  },
  {
    id: 'numbers-2',
    category: 'numbers',
    question: 'Combien de temps mon numéro reste-t-il actif ?',
    answer: `La durée d'activation dépend du type d'achat :

• **Activation simple** : Le numéro reste actif **20 minutes** pour recevoir le SMS
• **Location** : Durée variable selon votre choix (4h, 24h, 7 jours, 30 jours)

Après expiration, le numéro est libéré et vous ne pouvez plus recevoir de SMS dessus. Si vous n'avez pas reçu de SMS, vous êtes automatiquement remboursé.`
  },
  {
    id: 'numbers-3',
    category: 'numbers',
    question: 'Pourquoi je n\'ai pas reçu de SMS ?',
    answer: `Plusieurs raisons peuvent expliquer l'absence de SMS :

1. **Délai normal** - Le SMS peut prendre 1-5 minutes pour arriver
2. **Service surchargé** - Certains services envoient les SMS avec du retard
3. **Numéro déjà utilisé** - Le numéro a peut-être déjà été utilisé pour ce service
4. **Problème côté service** - Le service (WhatsApp, etc.) peut avoir des difficultés

**Solution** : Si après 10 minutes vous n'avez toujours pas reçu le SMS, annulez l'activation. Vous serez remboursé automatiquement et pourrez réessayer avec un autre numéro.`
  },
  {
    id: 'numbers-4',
    category: 'numbers',
    question: 'Puis-je utiliser le même numéro pour plusieurs services ?',
    answer: `**Pour une activation simple** : Non, un numéro ne peut être utilisé que pour un seul service à la fois.

**Pour une location** : Oui ! Avec un numéro en location, vous pouvez recevoir des SMS de plusieurs services pendant toute la durée de la location. C'est idéal si vous avez besoin de vérifier plusieurs comptes.`
  },
  {
    id: 'numbers-5',
    category: 'numbers',
    question: 'Comment copier le numéro ou le code SMS ?',
    answer: `Pour copier facilement :

• **Copier le numéro** : Cliquez sur l'icône de copie 📋 à côté du numéro
• **Copier le code SMS** : Quand le SMS arrive, cliquez sur le code pour le copier automatiquement

Le code est généralement mis en évidence pour faciliter la copie. Vous pouvez ensuite le coller directement dans l'application qui demande la vérification.`
  },

  // 💰 SOLDE & REMBOURSEMENT
  {
    id: 'balance-1',
    category: 'balance',
    question: 'Qu\'est-ce que le solde gelé (frozen) ?',
    answer: `Le **solde gelé** est une mesure de sécurité :

Quand vous achetez un numéro, le montant est temporairement "gelé" (réservé) plutôt que directement déduit. 

• **Si vous recevez le SMS** → Le montant gelé est définitivement débité
• **Si vous n'avez pas reçu de SMS** → Le montant gelé est automatiquement remboursé

Cela vous protège : vous ne payez que si le service fonctionne !`
  },
  {
    id: 'balance-2',
    category: 'balance',
    question: 'Comment fonctionne le remboursement automatique ?',
    answer: `Le remboursement est **100% automatique** :

1. Vous achetez un numéro → Le montant est gelé
2. Vous attendez le SMS pendant la durée d'activation (20 min max)
3. **Cas 1** : SMS reçu → Paiement confirmé ✓
4. **Cas 2** : Pas de SMS après expiration → Remboursement automatique ✓

Vous pouvez aussi annuler manuellement avant expiration pour un remboursement immédiat. Le montant retourne directement sur votre solde disponible.`
  },
  {
    id: 'balance-3',
    category: 'balance',
    question: 'Pourquoi mon solde a diminué sans achat ?',
    answer: `Si votre solde a diminué sans achat visible, vérifiez :

1. **Historique des transactions** - Consultez votre historique complet
2. **Activations expirées** - Un achat de numéro récent qui a été finalisé
3. **Locations en cours** - Vérifiez si vous avez des locations actives

Si vous ne trouvez pas l'explication, contactez le support avec votre email et nous vérifierons votre compte.`
  },
  {
    id: 'balance-4',
    category: 'balance',
    question: 'Puis-je retirer mon solde en argent réel ?',
    answer: `Actuellement, le solde One SMS ne peut pas être converti en argent réel. Le crédit sert uniquement à acheter des numéros virtuels et des locations sur la plateforme.

Nous vous conseillons de recharger uniquement le montant dont vous avez besoin.`
  },

  // 🔄 LOCATION DE NUMÉROS
  {
    id: 'rental-1',
    category: 'rental',
    question: 'Quelle est la différence entre activation et location ?',
    answer: `**Activation simple** :
• Usage unique pour un seul service
• Durée : 20 minutes maximum
• Idéal pour une vérification rapide
• Prix plus bas

**Location** :
• Usage multiple pour plusieurs services
• Durée : 4h, 24h, 7 jours ou 30 jours
• Vous gardez le même numéro
• Idéal pour les comptes professionnels ou multiples vérifications
• Renouvellement possible`
  },
  {
    id: 'rental-2',
    category: 'rental',
    question: 'Comment prolonger ma location ?',
    answer: `Pour prolonger une location active :

1. Allez dans **"Locations"** ou **"Mes numéros"**
2. Trouvez votre location active
3. Cliquez sur **"Prolonger"** ou **"Renouveler"**
4. Choisissez la nouvelle durée
5. Confirmez le paiement

La prolongation s'ajoute à la durée restante. Pensez à renouveler avant expiration pour ne pas perdre le numéro !`
  },
  {
    id: 'rental-3',
    category: 'rental',
    question: 'Que se passe-t-il quand ma location expire ?',
    answer: `Quand une location expire :

• Le numéro est **libéré** et peut être attribué à un autre utilisateur
• Vous ne recevrez **plus de SMS** sur ce numéro
• Les comptes associés à ce numéro ne pourront plus recevoir de codes de vérification

**Important** : Si vous avez associé des comptes importants à ce numéro, pensez à changer le numéro de vérification avant expiration ou à renouveler la location.`
  },

  // 🔐 COMPTE & SÉCURITÉ
  {
    id: 'account-1',
    category: 'account',
    question: 'Comment créer un compte One SMS ?',
    answer: `Créer un compte est simple et gratuit :

1. Cliquez sur **"S'inscrire"** sur la page d'accueil
2. Entrez votre **adresse email**
3. Créez un **mot de passe** sécurisé
4. Confirmez votre email via le lien reçu
5. Connectez-vous et rechargez pour commencer !

Vous pouvez aussi vous inscrire avec Google pour plus de rapidité.`
  },
  {
    id: 'account-2',
    category: 'account',
    question: 'J\'ai oublié mon mot de passe, comment le récupérer ?',
    answer: `Pour récupérer votre mot de passe :

1. Sur la page de connexion, cliquez sur **"Mot de passe oublié ?"**
2. Entrez votre adresse email
3. Vérifiez votre boîte mail (et les spams)
4. Cliquez sur le lien de réinitialisation
5. Créez un nouveau mot de passe

Le lien expire après 24h. Si vous ne recevez pas l'email, vérifiez que vous utilisez la bonne adresse.`
  },
  {
    id: 'account-3',
    category: 'account',
    question: 'Mon compte est-il sécurisé ?',
    answer: `Oui, nous prenons la sécurité très au sérieux :

• **Chiffrement SSL** : Toutes les communications sont cryptées
• **Mots de passe hashés** : Vos mots de passe ne sont jamais stockés en clair
• **Paiements sécurisés** : Via des partenaires certifiés (PayTech)
• **Pas de données personnelles** : Nous ne stockons que votre email

Pour plus de sécurité, utilisez un mot de passe unique et complexe.`
  },
  {
    id: 'account-4',
    category: 'account',
    question: 'Comment supprimer mon compte ?',
    answer: `Pour supprimer votre compte :

1. Connectez-vous à votre compte
2. Allez dans **Paramètres** > **Compte**
3. Cliquez sur **"Supprimer mon compte"**
4. Confirmez votre choix

**Attention** : La suppression est définitive. Votre solde restant sera perdu et ne peut pas être récupéré. Assurez-vous d'avoir utilisé tout votre crédit avant de supprimer.`
  },
  {
    id: 'account-5',
    category: 'account',
    question: 'Comment changer la langue de l\'interface ?',
    answer: `Pour changer la langue :

1. Cliquez sur l'icône **globe** 🌐 dans le header
2. Sélectionnez **Français** ou **English**

Votre préférence est sauvegardée automatiquement pour vos prochaines visites.`
  },
];

export default function SupportPage() {
  const { user } = useAuthStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    subject: '',
    message: '',
    email: user?.email || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Filtrer les FAQ
  const filteredFAQs = useMemo(() => {
    return faqData.filter(faq => {
      const matchesSearch = searchQuery === '' || 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === null || faq.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Toggle FAQ
  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  // Soumettre le formulaire de contact
  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simuler l'envoi (à remplacer par un vrai appel API)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Ouvrir le client mail avec les infos pré-remplies
    const mailtoLink = `mailto:support@onesms.sn?subject=${encodeURIComponent(contactForm.subject)}&body=${encodeURIComponent(
      `De: ${contactForm.email}\n\n${contactForm.message}`
    )}`;
    window.location.href = mailtoLink;
    
    setIsSubmitting(false);
    setSubmitSuccess(true);
    setContactForm({ subject: '', message: '', email: user?.email || '' });
    
    setTimeout(() => setSubmitSuccess(false), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
            <HelpCircle className="h-5 w-5 text-cyan-400" />
            <span className="text-white/80 text-sm font-medium">Centre d'aide</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Comment pouvons-nous
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400"> vous aider ?</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Trouvez rapidement des réponses à vos questions ou contactez notre équipe de support
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <Input
              type="text"
              placeholder="Rechercher une question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/40 rounded-2xl text-lg focus:border-cyan-400/50 focus:ring-cyan-400/20"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white border border-white/10'
            }`}
          >
            Toutes
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all duration-300 ${
                selectedCategory === cat.id
                  ? `bg-gradient-to-r ${cat.gradient} text-white shadow-lg`
                  : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white border border-white/10'
              }`}
            >
              {cat.icon}
              <span className="hidden sm:inline">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="max-w-3xl mx-auto mb-16">
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/60 text-lg">Aucune question trouvée pour "{searchQuery}"</p>
              <p className="text-white/40 mt-2">Essayez avec d'autres mots-clés ou contactez-nous</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFAQs.map(faq => {
                const category = categories.find(c => c.id === faq.category);
                const isExpanded = expandedFAQ === faq.id;
                
                return (
                  <div
                    key={faq.id}
                    className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                      isExpanded 
                        ? 'bg-white/15 backdrop-blur-md border border-white/20' 
                        : 'bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full flex items-center gap-4 p-5 text-left"
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${category?.gradient} flex items-center justify-center flex-shrink-0`}>
                        {category?.icon}
                      </div>
                      <span className="flex-1 text-white font-medium pr-4">{faq.question}</span>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-white/50 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-white/50 flex-shrink-0" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-0">
                        <div className="pl-14 text-white/70 leading-relaxed whitespace-pre-line">
                          {faq.answer}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Contact Section */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Vous n'avez pas trouvé votre réponse ?
            </h2>
            <p className="text-white/60">Contactez notre équipe, nous vous répondrons dans les plus brefs délais</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Contact Form */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-3xl">
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Mail className="h-5 w-5 text-cyan-400" />
                Envoyer un message
              </h3>
              
              {submitSuccess ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white font-medium text-lg">Message préparé !</p>
                  <p className="text-white/60 text-sm mt-2">Votre application mail devrait s'ouvrir</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitContact} className="space-y-4">
                  {!user && (
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Votre email</label>
                      <Input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                        placeholder="votre@email.com"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Sujet</label>
                    <Input
                      type="text"
                      required
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                      placeholder="Ex: Problème de paiement"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Message</label>
                    <Textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl resize-none"
                      placeholder="Décrivez votre problème en détail..."
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-semibold"
                  >
                    {isSubmitting ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Envoyer le message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </Card>

            {/* Contact Info */}
            <div className="space-y-4">
              {/* Email Card */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-3xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Email</h4>
                    <p className="text-white/60 text-sm mb-3">Réponse sous 24h</p>
                    <a 
                      href="mailto:support@onesms.sn"
                      className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      support@onesms.sn
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </Card>

              {/* WhatsApp Card */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-3xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">WhatsApp</h4>
                    <p className="text-white/60 text-sm mb-3">Réponse rapide</p>
                    <a 
                      href="https://wa.me/221781234567"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      +221 78 123 45 67
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </Card>

              {/* Availability */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-3xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">Disponibilité</h4>
                    <p className="text-white/60 text-sm">
                      Lundi - Vendredi : 9h - 18h<br />
                      Samedi : 10h - 14h<br />
                      Dimanche : Fermé
                    </p>
                  </div>
                </div>
              </Card>

              {/* Quick Links */}
              <div className="flex gap-3">
                <Link to="/how-to-use" className="flex-1">
                  <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-amber-400" />
                      <span className="text-white/80 text-sm font-medium">Guide</span>
                      <ArrowRight className="h-4 w-4 text-white/40 ml-auto group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Card>
                </Link>
                <Link to="/terms" className="flex-1">
                  <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-blue-400" />
                      <span className="text-white/80 text-sm font-medium">CGU</span>
                      <ArrowRight className="h-4 w-4 text-white/40 ml-auto group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Card>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 text-white/40 text-sm">
          <p>© 2024 One SMS - Tous droits réservés</p>
        </div>
      </div>
    </div>
  );
}
