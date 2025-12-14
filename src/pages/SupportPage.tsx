import { useState, useMemo } from 'react';
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
  ArrowRight
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
  ],
  en: [
    { 
      id: 'payment', 
      name: 'Payment & Top-up', 
      icon: <CreditCard className="h-5 w-5" />,
      color: 'text-emerald-400',
      gradient: 'from-emerald-500 to-green-400'
    },
    { 
      id: 'numbers', 
      name: 'Numbers & SMS', 
      icon: <Smartphone className="h-5 w-5" />,
      color: 'text-blue-400',
      gradient: 'from-blue-500 to-cyan-400'
    },
    { 
      id: 'balance', 
      name: 'Balance & Refunds', 
      icon: <Wallet className="h-5 w-5" />,
      color: 'text-amber-400',
      gradient: 'from-amber-500 to-orange-400'
    },
    { 
      id: 'rental', 
      name: 'Number Rentals', 
      icon: <RefreshCw className="h-5 w-5" />,
      color: 'text-purple-400',
      gradient: 'from-purple-500 to-pink-400'
    },
    { 
      id: 'account', 
      name: 'Account & Security', 
      icon: <Shield className="h-5 w-5" />,
      color: 'text-rose-400',
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

1. Utilisez le sélecteur FR/EN en haut de la page
2. Choisissez **Français** ou **English**

Votre préférence est sauvegardée automatiquement pour vos prochaines visites.`
    },
  ],
  en: [
    // 💳 PAYMENT & TOP-UP
    {
      id: 'payment-1',
      category: 'payment',
      question: 'How do I top up my One SMS account?',
      answer: `To add credit to your account:

1. Sign in to One SMS
2. Click "Top up" in the menu or the top-up button
3. Pick a pack (1000 FCFA, 2000 FCFA, 5000 FCFA, etc.)
4. Choose a payment method (Orange Money, Wave, Free Money, bank card)
5. Confirm the payment

Your balance is credited instantly after confirmation.`
    },
    {
      id: 'payment-2',
      category: 'payment',
      question: 'Which payment methods are accepted?',
      answer: `One SMS accepts:

• **Mobile Money**: Orange Money, Wave, Free Money
• **Bank cards**: Visa, Mastercard
• **Online payment**: PayTech

Payments are secure and the credit is added instantly to your balance.`
    },
    {
      id: 'payment-3',
      category: 'payment',
      question: 'My payment was debited but my balance did not increase?',
      answer: `If you were charged but your balance is unchanged:

1. **Wait a few minutes** – credit can take 1-5 minutes
2. **Refresh the page** – balance may not have refreshed
3. **Check your history** – see if the transaction appears

If after 15 minutes nothing changed, contact support with:
• Your account email
• The paid amount
• Proof of payment (screenshot)`
    },
    {
      id: 'payment-4',
      category: 'payment',
      question: 'Is there a minimum top-up amount?',
      answer: `The minimum depends on the chosen pack. Packs start at **500 FCFA**.

Larger packs give you better rates. See the Top-up page for all packs and bonuses.`
    },

    // 📱 NUMBERS & SMS
    {
      id: 'numbers-1',
      category: 'numbers',
      question: 'How do I get a virtual number?',
      answer: `To get a virtual number:

1. From the Dashboard, select the **service** (WhatsApp, Telegram, Google, etc.)
2. Choose the **country** you need
3. Click **"Buy"** or **"Get number"**
4. The amount is deducted from your balance
5. Your number appears instantly in "Active numbers"

Use this number to receive your verification SMS.`
    },
    {
      id: 'numbers-2',
      category: 'numbers',
      question: 'How long does my number stay active?',
      answer: `It depends on the purchase type:

• **Single activation**: active **20 minutes** to receive the SMS
• **Rental**: duration varies (4h, 24h, 7 days, 30 days)

After expiry the number is released and cannot receive SMS. If no SMS was received, you are automatically refunded.`
    },
    {
      id: 'numbers-3',
      category: 'numbers',
      question: "Why didn't I receive an SMS?",
      answer: `Several reasons:

1. **Normal delay** – SMS can take 1-5 minutes
2. **Service congestion** – some services send late
3. **Number reused** – the number may have been used for this service
4. **Service issue** – the service (WhatsApp, etc.) may have problems

**Fix**: If after 10 minutes you still have nothing, cancel the activation. You'll be automatically refunded and can try another number.`
    },
    {
      id: 'numbers-4',
      category: 'numbers',
      question: 'Can I use the same number for multiple services?',
      answer: `**Single activation**: No, one number per service.

**Rental**: Yes. A rented number can receive SMS from multiple services during the rental. Ideal for multiple accounts.`
    },
    {
      id: 'numbers-5',
      category: 'numbers',
      question: 'How do I copy the number or SMS code?',
      answer: `To copy quickly:

• **Copy the number**: click the 📋 icon next to it
• **Copy the SMS code**: when the SMS arrives, click the code to copy

The code is highlighted for easy copy-paste into the target app.`
    },

    // 💰 BALANCE & REFUNDS
    {
      id: 'balance-1',
      category: 'balance',
      question: 'What is frozen balance?',
      answer: `**Frozen balance** is a safety measure:

When you buy a number, the amount is temporarily "frozen" (reserved) instead of directly deducted.

• **If you receive the SMS** → the frozen amount is captured
• **If no SMS arrives** → the frozen amount is automatically refunded

You only pay when it works!`
    },
    {
      id: 'balance-2',
      category: 'balance',
      question: 'How does automatic refund work?',
      answer: `Refunds are **100% automatic**:

1. You buy a number → amount is frozen
2. You wait during activation (max 20 min)
3. **Case 1**: SMS received → payment confirmed ✓
4. **Case 2**: No SMS after expiry → automatic refund ✓

You can also cancel before expiry for an immediate refund. Funds go back to your available balance.`
    },
    {
      id: 'balance-3',
      category: 'balance',
      question: 'Why did my balance drop without a purchase?',
      answer: `If your balance decreased unexpectedly, check:

1. **Transaction history** – full history of debits
2. **Expired activations** – a recent number purchase that finalized
3. **Active rentals** – see if you have ongoing rentals

If you still can't explain it, contact support with your email and we'll investigate.`
    },
    {
      id: 'balance-4',
      category: 'balance',
      question: 'Can I withdraw my balance as cash?',
      answer: `No. One SMS balance cannot be converted to cash; it's only for numbers and rentals.

Top up only what you need.`
    },

    // 🔄 RENTALS
    {
      id: 'rental-1',
      category: 'rental',
      question: 'What is the difference between activation and rental?',
      answer: `**Single activation**:
• One-time use for one service
• Duration: 20 minutes max
• Perfect for quick verification
• Lower price

**Rental**:
• Multiple services
• Duration: 4h, 24h, 7 days, or 30 days
• You keep the same number
• Ideal for pro use or multiple verifications
• Renewable`
    },
    {
      id: 'rental-2',
      category: 'rental',
      question: 'How do I extend my rental?',
      answer: `To extend an active rental:

1. Go to **"Rentals"** or **"My numbers"**
2. Find your active rental
3. Click **"Extend"** or **"Renew"**
4. Choose the new duration
5. Confirm payment

The extension adds to remaining time. Renew before expiry to keep the number.`
    },
    {
      id: 'rental-3',
      category: 'rental',
      question: 'What happens when my rental expires?',
      answer: `When a rental expires:

• The number is **released** and may be reassigned
• You **stop receiving SMS** on it
• Accounts linked to this number can no longer get verification codes

**Important**: If critical accounts use this number, change their verification number before expiry or renew the rental.`
    },

    // 🔐 ACCOUNT & SECURITY
    {
      id: 'account-1',
      category: 'account',
      question: 'How do I create a One SMS account?',
      answer: `It's simple and free:

1. Click **"Sign up"** on the home page
2. Enter your **email address**
3. Create a strong **password**
4. Confirm your email via the link received
5. Sign in and top up to start!

You can also sign up with Google for speed.`
    },
    {
      id: 'account-2',
      category: 'account',
      question: 'I forgot my password, how do I reset it?',
      answer: `To reset your password:

1. On the login page, click **"Forgot password?"**
2. Enter your email address
3. Check your inbox (and spam)
4. Click the reset link
5. Create a new password

The link expires after 24h. If you don't get the email, verify the address used.`
    },
    {
      id: 'account-3',
      category: 'account',
      question: 'Is my account secure?',
      answer: `Yes. We take security seriously:

• **SSL encryption**: all traffic is encrypted
• **Hashed passwords**: never stored in plain text
• **Secure payments**: via certified partners (PayTech)
• **Minimal data**: we only store your email

Use a unique, strong password for extra safety.`
    },
    {
      id: 'account-4',
      category: 'account',
      question: 'How do I delete my account?',
      answer: `To delete your account:

1. Sign in
2. Go to **Settings** > **Account**
3. Click **"Delete my account"**
4. Confirm

**Warning**: Deletion is permanent. Remaining balance is lost and cannot be recovered. Use your credit before deleting.`
    },
    {
      id: 'account-5',
      category: 'account',
      question: 'How do I change the interface language?',
      answer: `To switch language:

1. Use the FR/EN toggle at the top of the page
2. Choose **French** or **English**

Your preference is saved for future visits.`
    },
  ],
};

const uiText: Record<Language, {
  helpBadge: string;
  heroLine1: string;
  heroHighlight: string;
  heroSubtitle: string;
  searchPlaceholder: string;
  allLabel: string;
  noResult: string;
  noResultHint: string;
  contactTitle: string;
  contactSubtitle: string;
  contactEmailLabel: string;
  contactSubjectLabel: string;
  contactMessageLabel: string;
  contactSubjectPlaceholder: string;
  contactMessagePlaceholder: string;
  contactEmailPlaceholder: string;
  contactSuccessTitle: string;
  contactSuccessDesc: string;
  contactSubmit: string;
  availabilityTitle: string;
  availabilityLines: string[];
  guideLabel: string;
  termsLabel: string;
  footer: string;
  quickWhatsApp: string;
  quickEmail: string;
  quickAvailability: string;
}> = {
  fr: {
    helpBadge: "Centre d'aide",
    heroLine1: 'Comment pouvons-nous',
    heroHighlight: ' vous aider ?',
    heroSubtitle: 'Trouvez rapidement des réponses à vos questions ou contactez notre équipe de support',
    searchPlaceholder: 'Rechercher une question...',
    allLabel: 'Toutes',
    noResult: 'Aucune question trouvée pour',
    noResultHint: 'Essayez avec d\'autres mots-clés ou contactez-nous',
    contactTitle: "Vous n'avez pas trouvé votre réponse ?",
    contactSubtitle: 'Contactez notre équipe, nous vous répondrons dans les plus brefs délais',
    contactEmailLabel: 'Votre email',
    contactSubjectLabel: 'Sujet',
    contactMessageLabel: 'Message',
    contactSubjectPlaceholder: 'Ex: Problème de paiement',
    contactMessagePlaceholder: 'Décrivez votre problème en détail...',
    contactEmailPlaceholder: 'votre@email.com',
    contactSuccessTitle: 'Message préparé !',
    contactSuccessDesc: "Votre application mail devrait s'ouvrir",
    contactSubmit: 'Envoyer le message',
    availabilityTitle: 'Disponibilité',
    availabilityLines: ['Lundi - Vendredi : 9h - 18h', 'Samedi : 10h - 14h', 'Dimanche : Fermé'],
    guideLabel: 'Guide',
    termsLabel: 'CGU',
    footer: '© 2025 One SMS - Tous droits réservés',
    quickWhatsApp: 'Réponse rapide',
    quickEmail: 'Réponse sous 24h',
    quickAvailability: 'Disponibilité',
  },
  en: {
    helpBadge: 'Help Center',
    heroLine1: 'How can we',
    heroHighlight: ' help you?',
    heroSubtitle: 'Find quick answers or reach our support team',
    searchPlaceholder: 'Search a question...',
    allLabel: 'All',
    noResult: 'No question found for',
    noResultHint: 'Try other keywords or contact us',
    contactTitle: "Didn't find your answer?",
    contactSubtitle: 'Contact our team, we reply shortly',
    contactEmailLabel: 'Your email',
    contactSubjectLabel: 'Subject',
    contactMessageLabel: 'Message',
    contactSubjectPlaceholder: 'E.g. Payment issue',
    contactMessagePlaceholder: 'Describe your issue in detail...',
    contactEmailPlaceholder: 'you@example.com',
    contactSuccessTitle: 'Message prepared!',
    contactSuccessDesc: 'Your mail client should open',
    contactSubmit: 'Send message',
    availabilityTitle: 'Availability',
    availabilityLines: ['Monday - Friday: 9am - 6pm', 'Saturday: 10am - 2pm', 'Sunday: Closed'],
    guideLabel: 'Guide',
    termsLabel: 'Terms',
    footer: '© 2025 One SMS - All rights reserved',
    quickWhatsApp: 'Quick reply',
    quickEmail: 'Reply within 24h',
    quickAvailability: 'Availability',
  },
};

export default function SupportPage() {
  const { user } = useAuthStore();
  const { i18n } = useTranslation();
  const currentLang: Language = i18n.language?.startsWith('en') ? 'en' : 'fr';

  const { data: contactSettings } = useQuery({
    queryKey: ['contact-settings'],
    queryFn: contactSettingsApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });
  
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

  const text = uiText[currentLang];
  const categories = categoriesByLang[currentLang];
  const faqData = faqDataByLang[currentLang];
  const supportTitle = contactSettings?.support_title || text.contactTitle;
  const supportSubtitle = contactSettings?.support_subtitle || text.contactSubtitle;
  const supportEmail = contactSettings?.email || 'support@onesms-sn.com';
  const emailResponse = contactSettings?.email_response_time || text.quickEmail;
  const whatsappNumber = contactSettings?.whatsapp || '+1 683 777 0410';
  const whatsappHours = contactSettings?.whatsapp_hours || text.quickWhatsApp;
  const whatsappHref = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`;

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

    const userName = user?.full_name || 'Utilisateur';
    const userEmail = contactForm.email || user?.email || '';

    // Submit contact form to database
    const result = await contactMessagesApi.submitContactForm({
      name: userName,
      email: userEmail,
      subject: contactForm.subject,
      message: contactForm.message,
    });

    setIsSubmitting(false);

    if (result.success) {
      setSubmitSuccess(true);

      // Send confirmation email to user
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            type: 'contact_confirmation',
            email: userEmail,
            data: {
              name: userName,
              subject: contactForm.subject,
            },
            userId: user?.id || null,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't show error to user - message was saved successfully
      }

      setContactForm({ subject: '', message: '', email: user?.email || '' });

      setTimeout(() => setSubmitSuccess(false), 5000);
    } else {
      // Show error toast or message
      console.error('Error submitting contact form:', result.error);
    }
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
            <span className="text-white/80 text-sm font-medium">{text.helpBadge}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {text.heroLine1}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{text.heroHighlight}</span>
          </h1>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            {text.heroSubtitle}
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <Input
              type="text"
              placeholder={text.searchPlaceholder}
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
            {text.allLabel}
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
              <p className="text-white/60 text-lg">{text.noResult} "{searchQuery}"</p>
              <p className="text-white/40 mt-2">{text.noResultHint}</p>
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
              {supportTitle}
            </h2>
            <p className="text-white/60">{supportSubtitle}</p>
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
                  <p className="text-white font-medium text-lg">{text.contactSuccessTitle}</p>
                  <p className="text-white/60 text-sm mt-2">{text.contactSuccessDesc}</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitContact} className="space-y-4">
                  {!user && (
                    <div>
                      <label className="block text-white/70 text-sm mb-2">{text.contactEmailLabel}</label>
                      <Input
                        type="email"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                        placeholder={text.contactEmailPlaceholder}
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-white/70 text-sm mb-2">{text.contactSubjectLabel}</label>
                    <Input
                      type="text"
                      required
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl"
                      placeholder={text.contactSubjectPlaceholder}
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">{text.contactMessageLabel}</label>
                    <Textarea
                      required
                      rows={4}
                      value={contactForm.message}
                      onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl resize-none"
                      placeholder={text.contactMessagePlaceholder}
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
                        {text.contactSubmit}
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
                    <p className="text-white/60 text-sm mb-3">{emailResponse}</p>
                    <a 
                      href={`mailto:${supportEmail}`}
                      className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      {supportEmail}
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
                    <p className="text-white/60 text-sm mb-3">{whatsappHours}</p>
                    <a 
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-400 hover:text-green-300 font-medium flex items-center gap-1 transition-colors"
                    >
                      {whatsappNumber}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </Card>

              {/* Instagram Card */}
              {contactSettings?.instagram && (
                <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-3xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Instagram</h4>
                      <p className="text-white/60 text-sm mb-3">
                        {i18n.language === 'fr' ? 'Suivez-nous sur Instagram' : 'Follow us on Instagram'}
                      </p>
                      <a 
                        href={`https://instagram.com/${contactSettings.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-400 hover:text-pink-300 font-medium flex items-center gap-1 transition-colors"
                      >
                        {contactSettings.instagram}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </Card>
              )}

              {/* Availability */}
              <Card className="bg-white/10 backdrop-blur-md border-white/20 p-6 rounded-3xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">{text.availabilityTitle}</h4>
                    <p className="text-white/60 text-sm">
                      {text.availabilityLines[0]}<br />
                      {text.availabilityLines[1]}<br />
                      {text.availabilityLines[2]}
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
                      <span className="text-white/80 text-sm font-medium">{text.guideLabel}</span>
                      <ArrowRight className="h-4 w-4 text-white/40 ml-auto group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Card>
                </Link>
                <Link to="/terms" className="flex-1">
                  <Card className="bg-white/5 backdrop-blur-sm border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all group">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-blue-400" />
                      <span className="text-white/80 text-sm font-medium">{text.termsLabel}</span>
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
          <p>{text.footer}</p>
        </div>
      </div>
    </div>
  );
}
