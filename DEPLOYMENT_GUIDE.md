# ONE SMS - Guide de Configuration et Déploiement

## ✅ Ce qui a été créé

### 1. **Configuration du Projet**

- ✅ Structure complète React + TypeScript + Vite
- ✅ Configuration Tailwind CSS + shadcn/ui
- ✅ Configuration ESLint et TypeScript
- ✅ Variables d'environnement (.env.example)

### 2. **Base de Données Supabase**

- ✅ Schéma SQL complet (supabase/schema.sql)
- ✅ Tables: users, credits_history, virtual_numbers, sms_received, transactions, services, countries, pricing_rules, providers, system_logs
- ✅ Row Level Security (RLS) policies
- ✅ Fonctions PostgreSQL pour gestion crédits
- ✅ Triggers pour updated_at et création utilisateur
- ✅ Types TypeScript générés (src/types/database.ts)

### 3. **Intégrations API**

- ✅ API 5sim.net - Client complet (src/lib/api/5sim.ts)
  - Get countries, services, prices
  - Buy activation, hosting
  - Get SMS, cancel/finish activation
- ✅ API Paytech - Client complet (src/lib/api/paytech.ts)
  - Request payment
  - Get payment status
  - Verify IPN/HMAC
  - Refund payment
  - Transfer funds

### 4. **Authentification**

- ✅ Supabase Auth configuré (src/lib/supabase.ts)
- ✅ Support Google OAuth
- ✅ Support Apple OAuth
- ✅ Email/Password
- ✅ Store Zustand pour état auth (src/stores/authStore.ts)

### 5. **Interface Utilisateur**

- ✅ Layout principal avec Header et Footer
- ✅ Page d'accueil (Hero, Features, CTA)
- ✅ Pages Login et Register
- ✅ Dashboard utilisateur (stub)
- ✅ Catalogue (stub)
- ✅ Mes Numéros (stub)
- ✅ Transactions (stub)
- ✅ Paramètres (stub)

### 6. **Interface Administration**

- ✅ AdminLayout avec menu latéral
- ✅ AdminDashboard
- ✅ Gestion Users, Providers, Services, Countries
- ✅ Gestion Transactions, Pricing, Analytics
- ✅ System Logs, Settings

### 7. **Internationalisation**

- ✅ i18next configuré
- ✅ Fichiers FR et EN (src/locales/)
- ✅ Switch langue dans Header

### 8. **Composants UI**

- ✅ Button, Input, Card
- ✅ Toast/Toaster
- ✅ Utilitaires CSS (cn, formatters)

### 9. **Routing**

- ✅ React Router configuré
- ✅ PrivateRoute pour routes protégées
- ✅ AdminRoute pour routes admin

---

## 🚀 Étapes de Déploiement

### Phase 1: Installation et Configuration (1-2h)

1. **Installer les dépendances**

```bash
cd "/Users/mac/Desktop/ONE SMS V1"
npm install
```

2. **Configurer Supabase**

   - Créer un projet sur https://supabase.com
   - Copier URL et ANON KEY du projet
   - Exécuter le schéma SQL dans l'éditeur SQL Supabase:
     ```bash
     # Copier le contenu de supabase/schema.sql
     # Coller dans Supabase SQL Editor
     # Exécuter
     ```

3. **Configurer les variables d'environnement**

```bash
cp .env.example .env
```

Éditer `.env` et remplir:

- VITE_SUPABASE_URL=votre_url_supabase
- VITE_SUPABASE_ANON_KEY=votre_anon_key
- VITE_5SIM_API_KEY=votre_cle_5sim
- VITE_PAYTECH_API_KEY=votre_cle_paytech
- VITE_PAYTECH_API_SECRET=votre_secret_paytech

4. **Configurer OAuth Providers dans Supabase**

   - Dashboard Supabase → Authentication → Providers
   - Activer Google: ajouter Client ID et Client Secret
   - Activer Apple: configurer selon docs Supabase
   - Ajouter redirect URL: http://localhost:3000/dashboard

5. **Ajouter le package crypto-js manquant**

```bash
npm install crypto-js
npm install --save-dev @types/crypto-js
```

6. **Lancer le projet en développement**

```bash
npm run dev
```

Ouvrir http://localhost:3000

---

### Phase 2: Fonctionnalités à Implémenter (ordre de priorité)

#### 2.1 Dashboard Utilisateur (Priority: HAUTE)

**Fichier:** `src/pages/DashboardPage.tsx`

Implémenter:

- Afficher solde crédits (fetch depuis users table)
- Afficher nombre de numéros actifs (query virtual_numbers)
- Afficher total SMS reçus (query sms_received)
- Liste activités récentes (dernières transactions + SMS)
- Actions rapides: Acheter numéro, Recharger crédits

```typescript
// Exemple de query Supabase
const { data: user } = await supabase
  .from("users")
  .select("credits")
  .eq("id", userId)
  .single();

const { data: activeNumbers } = await supabase
  .from("virtual_numbers")
  .select("*")
  .eq("user_id", userId)
  .eq("status", "active");
```

#### 2.2 Catalogue Services & Pays (Priority: HAUTE)

**Fichier:** `src/pages/CatalogPage.tsx`

Implémenter:

1. Fetch services depuis 5sim API ou DB
2. Fetch pays disponibles
3. Filtres par service, pays, catégorie
4. Recherche
5. Affichage prix depuis pricing_rules
6. Bouton "Acheter" → ouvre modal d'achat

```typescript
import { getServices, getCountries, getPrices } from "@/lib/api/5sim";

// Dans le composant
const { data: services } = useQuery(["services"], getServices);
const { data: countries } = useQuery(["countries"], getCountries);
```

#### 2.3 Modal d'Achat de Numéro (Priority: HAUTE)

**Créer:** `src/components/features/PurchaseNumberModal.tsx`

Flow:

1. Sélectionner type: Activation / Location courte / Location longue
2. Sélectionner pays
3. Sélectionner opérateur
4. Afficher prix (fetch depuis pricing_rules)
5. Vérifier crédits suffisants
6. Si insuffisant → redirect vers rechargement
7. Acheter → API 5sim buyActivation ou buyHosting
8. Enregistrer dans virtual_numbers
9. Déduire crédits (fonction deduct_credits)
10. Afficher numéro acheté

#### 2.4 Mes Numéros (Priority: HAUTE)

**Fichier:** `src/pages/MyNumbersPage.tsx`

Implémenter:

- Liste numéros actifs/expirés
- Pour chaque numéro:
  - Numéro de téléphone
  - Service
  - Statut
  - Temps restant (calculateTimeRemaining)
  - Bouton "Voir SMS"
- Modal affichant SMS reçus pour un numéro
- Boutons Annuler / Renouveler

#### 2.5 Webhook SMS (Priority: HAUTE)

**Créer:** Supabase Edge Function

Créer un endpoint webhook:

```bash
supabase functions new receive-sms-webhook
```

Dans la fonction:

1. Recevoir notification 5sim
2. Vérifier authenticité (API key)
3. Extraire: virtual_number_id, sender, message, code
4. Insérer dans sms_received
5. Notifier utilisateur (Push + Email)

```typescript
// Exemple Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const payload = await req.json();

  // Insérer SMS
  const { data, error } = await supabase.from("sms_received").insert({
    virtual_number_id: payload.order_id,
    user_id: payload.user_id,
    phone_number: payload.phone,
    sender: payload.sender,
    message: payload.text,
    code: extractCodeFromSMS(payload.text),
  });

  return new Response("OK");
});
```

#### 2.6 Rechargement Crédits avec Paytech (Priority: HAUTE)

**Créer:** `src/components/features/AddCreditsModal.tsx`

Flow:

1. Utilisateur saisit montant en FCFA
2. Calculer équivalent en crédits (ex: 1000 FCFA = 1000 crédits)
3. Appeler requestPayment de Paytech
4. Rediriger vers page Paytech
5. IPN callback → Edge Function
6. Edge Function vérifie IPN
7. Si succès → appeler add_credits()
8. Notifier utilisateur

**Créer Edge Function:** `supabase functions new paytech-ipn`

#### 2.7 Transactions (Priority: MOYENNE)

**Fichier:** `src/pages/TransactionsPage.tsx`

- Liste transactions avec filtres
- Export CSV/PDF (utiliser jspdf + jspdf-autotable)

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const exportPDF = (transactions) => {
  const doc = new jsPDF();
  autoTable(doc, {
    head: [["Date", "Type", "Amount", "Status"]],
    body: transactions.map((t) => [t.date, t.type, t.amount, t.status]),
  });
  doc.save("transactions.pdf");
};
```

#### 2.8 Pricing Management Admin (Priority: MOYENNE)

**Fichier:** `src/pages/admin/AdminPricing.tsx`

Implémenter:

- Table pricing_rules avec tri, filtres
- Colonnes: Pays, Service, Opérateur, Type, Coût fournisseur, Prix vente, Marge %
- Édition inline du prix de vente
- Calcul automatique marge %
- Alerte si marge négative
- Bouton "Sync from 5sim" → fetch prices API → update pricing_rules

```typescript
// Sync prices
const syncPrices = async () => {
  const prices = await getPrices();

  for (const price of prices) {
    await supabase.from("pricing_rules").upsert({
      provider: "5sim",
      country_code: price.country,
      service: price.product,
      operator: price.operator,
      provider_cost: price.cost,
      selling_price: price.cost * 1.2, // 20% marge
      last_updated_from_provider: new Date(),
    });
  }
};
```

#### 2.9 Analytics Admin (Priority: BASSE)

**Fichier:** `src/pages/admin/AdminAnalytics.tsx`

Utiliser recharts:

- Graphique revenus mensuels
- Graphique nouveaux utilisateurs
- Graphique SMS reçus
- Top services
- Top pays

```typescript
import { LineChart, BarChart } from "recharts";

// Query aggregated data
const { data: revenues } = await supabase.rpc("get_monthly_revenues");
```

#### 2.10 Notifications Push (Priority: BASSE)

**Configuration Firebase:**

1. Créer projet Firebase
2. Ajouter clés dans .env
3. Créer fichier `src/lib/firebase.ts`

```typescript
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // ...
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
```

4. Request permission et save token dans user profile
5. Envoyer notifications depuis Edge Functions

---

### Phase 3: Tests et Déploiement

#### Tests

```bash
# Installer Vitest
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Créer tests unitaires pour:
# - Fonctions utils
# - API clients
# - Composants critiques
```

#### Build Production

```bash
npm run build
# Fichiers générés dans /dist
```

#### Déploiement

**Options:**

1. **Vercel** (Recommandé)

   ```bash
   npm install -g vercel
   vercel
   ```

2. **Netlify**

   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

3. **VPS Custom**
   - Build → Upload dist/ → Configure nginx/apache
   - SSL avec Let's Encrypt

---

## 📋 Checklist de Lancement

### Technique

- [ ] Toutes les variables d'environnement configurées
- [ ] Base de données Supabase déployée
- [ ] OAuth providers configurés
- [ ] Webhook endpoints testés
- [ ] Clés API 5sim et Paytech valides en prod
- [ ] Tests automatisés passent
- [ ] Build production sans erreurs
- [ ] Monitoring configuré (Sentry, etc.)

### Business

- [ ] Mode Paytech en production activé
- [ ] Compte Paytech validé
- [ ] Tarification définie et rentable
- [ ] CGU et Politique de confidentialité rédigées
- [ ] Support client configuré
- [ ] Stratégie marketing définie

### Sécurité

- [ ] HTTPS activé
- [ ] RLS Supabase vérifié
- [ ] Clés API sécurisées
- [ ] Rate limiting configuré
- [ ] Logs d'audit activés
- [ ] Backup base de données planifié

---

## 🎯 Roadmap Post-Lancement

### Court terme (1-2 mois)

- [ ] Analytics utilisateur détaillées
- [ ] Programme de parrainage
- [ ] Offres promotionnelles
- [ ] Support multi-devises

### Moyen terme (3-6 mois)

- [ ] Application mobile (React Native)
- [ ] API publique pour développeurs
- [ ] Intégration autres providers SMS
- [ ] Programme de fidélité

### Long terme (6-12 mois)

- [ ] Expansion internationale
- [ ] Services B2B / Enterprise
- [ ] Intégrations tierces (Zapier, etc.)
- [ ] IA pour détection fraude

---

## 📞 Support & Maintenance

### Monitoring

- Uptime: https://uptimerobot.com
- Errors: https://sentry.io
- Analytics: https://plausible.io (RGPD compliant)

### Backup

- Supabase: Backup automatique quotidien
- Code: GitHub private repo

### Mises à jour

- Dépendances: `npm outdated` + `npm update` mensuel
- Supabase: Suivre changelog
- Sécurité: Audit npm avec `npm audit`

---

## 🤝 Contribution

Pour toute question ou amélioration, contacter:

- Email: support@onesms.com
- Documentation complète du code dans chaque fichier

---

**Projet créé avec ❤️ selon le cahier des charges One SMS**
