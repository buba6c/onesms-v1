# 🌊 INTÉGRATION WAVE - Paiement Direct avec URL Dynamique

## 📋 Vue d'ensemble

Ce système permet d'intégrer Wave comme provider de paiement en utilisant un lien de paiement direct. Le montant est inséré dynamiquement dans l'URL selon le package choisi par l'utilisateur.

## 🏗️ Architecture

### 1. Base de données (`payment_providers`)

```sql
-- Provider Wave dans la table payment_providers
{
  provider_code: 'wave',
  provider_name: 'Wave',
  is_active: true/false,  -- Contrôlable depuis l'admin
  is_default: true/false, -- Provider par défaut
  config: {
    payment_link_template: 'https://pay.wave.com/m/M_2wPEpxMumWXY/c/sn/?amount={amount}',
    merchant_id: 'M_2wPEpxMumWXY',
    country_code: 'sn',
    currency: 'XOF'
  }
}
```

**Le placeholder `{amount}` sera remplacé dynamiquement par le montant.**

### 2. Intégration Frontend (`TopUpPage.tsx`)

```tsx
// Dans rechargeMutation
if (selectedProvider === 'wave') {
  // 1. Récupérer la config Wave
  const { data: waveProvider } = await supabase
    .from('payment_providers')
    .select('config')
    .eq('provider_code', 'wave')
    .single();

  // 2. Créer transaction pending
  const { data: transaction } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount: amount,
      type: 'recharge',
      status: 'pending',
      payment_method: 'wave',
      metadata: { ... }
    });

  // 3. Générer URL dynamique
  const waveUrl = waveProvider.config.payment_link_template
    .replace('{amount}', amount.toString());

  // 4. Rediriger
  return { redirect_url: waveUrl };
}
```

### 3. Gestion Admin (`AdminPaymentProviders.tsx`)

L'admin peut :

- ✅ Activer/Désactiver Wave
- ⭐ Définir comme provider par défaut
- 🔧 Modifier le lien de paiement (merchant_id, etc.)
- 📊 Voir l'historique des modifications
- 🔍 Afficher la configuration actuelle

## 🚀 Déploiement

### Étape 1 : Appliquer la migration

```bash
# Option A : Via Supabase CLI
npx supabase db push

# Option B : Exécuter manuellement
# Copiez le contenu de supabase/migrations/20251212_add_wave_provider.sql
# dans l'éditeur SQL de Supabase
```

### Étape 2 : Configurer Wave

```bash
# Activer Wave
node configure_wave_provider.mjs

# Tester l'intégration
node test_wave_integration.mjs
```

### Étape 3 : Activer depuis l'admin

1. Allez sur `/admin/payment-providers`
2. Trouvez "Wave"
3. Cliquez sur le toggle pour activer
4. (Optionnel) Définissez comme provider par défaut

## 💳 Flux utilisateur

```
┌─────────────────────────────────────────────────────────────┐
│                    1. Page TopUp                            │
│  Utilisateur sélectionne:                                   │
│  - Montant: 5000 FCFA (10 activations)                     │
│  - Provider: Wave                                           │
│  - Clique sur "Payer"                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              2. Création Transaction                        │
│  Status: pending                                            │
│  Amount: 5000                                               │
│  Payment_method: wave                                       │
│  Metadata: { activations: 10, ... }                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              3. Génération URL Wave                         │
│  Template: https://pay.wave.com/m/.../sn/?amount={amount}  │
│  Result:   https://pay.wave.com/m/.../sn/?amount=5000      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              4. Redirection Wave                            │
│  window.location.href = waveUrl                             │
│  Utilisateur paie via Wave                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              5. Retour utilisateur                          │
│  [MANUEL] L'utilisateur revient sur le dashboard           │
│  [AUTOMATIQUE] Webhook Wave (si implémenté)                │
└─────────────────────────────────────────────────────────────┘
```

## ⚠️ IMPORTANT - Confirmation de paiement

**Ce système utilise un lien de paiement simple sans callback automatique.**

### Options de validation :

#### Option 1 : Validation manuelle (Actuelle)

- L'utilisateur paie via Wave
- Il revient manuellement sur le site
- Admin vérifie et valide depuis `/admin/transactions`

#### Option 2 : Webhook Wave (Recommandé)

Si Wave propose une API webhook :

```typescript
// supabase/functions/wave-webhook/index.ts
Deno.serve(async (req) => {
  const signature = req.headers.get("x-wave-signature");
  const payload = await req.json();

  // Vérifier signature
  // Mettre à jour transaction
  // Créditer wallet

  return new Response("OK", { status: 200 });
});
```

#### Option 3 : Polling

Vérifier périodiquement les paiements via l'API Wave

## 🔧 Configuration avancée

### Modifier le lien de paiement

Depuis l'admin ou via script :

```javascript
// configure_wave_provider.mjs
await supabase
  .from("payment_providers")
  .update({
    config: {
      payment_link_template: "VOTRE_NOUVEAU_LIEN/?amount={amount}",
      merchant_id: "VOTRE_MERCHANT_ID",
      country_code: "sn",
      currency: "XOF",
    },
  })
  .eq("provider_code", "wave");
```

### Ajouter des frais Wave

```sql
UPDATE payment_providers
SET fees_config = jsonb_build_object(
  'fixed_fee', 100,
  'percentage_fee', 2.5,
  'min_fee', 50,
  'max_fee', 500
)
WHERE provider_code = 'wave';
```

### Tester avec différents montants

```bash
node test_wave_integration.mjs
```

Le script testera automatiquement avec tous vos packages.

## 📊 Monitoring

### Depuis l'admin

1. **Transactions** : `/admin/transactions`

   - Voir toutes les transactions Wave
   - Filtrer par status (pending/completed/failed)
   - Valider manuellement les paiements

2. **Payment Providers** : `/admin/payment-providers`

   - Status du provider Wave
   - Historique des modifications
   - Configuration actuelle

3. **Logs** : `payment_provider_logs`
   - Toutes les activations/désactivations
   - Modifications de configuration
   - Changements de provider par défaut

### Requêtes SQL utiles

```sql
-- Transactions Wave en attente
SELECT * FROM transactions
WHERE payment_method = 'wave'
AND status = 'pending'
ORDER BY created_at DESC;

-- Stats Wave
SELECT
  COUNT(*) as total,
  SUM(amount) as total_amount,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
FROM transactions
WHERE payment_method = 'wave'
AND created_at > NOW() - INTERVAL '7 days';

-- Historique configuration Wave
SELECT * FROM payment_provider_logs
WHERE provider_id = (
  SELECT id FROM payment_providers WHERE provider_code = 'wave'
)
ORDER BY created_at DESC;
```

## 🐛 Dépannage

### Wave n'apparaît pas dans TopUp

1. Vérifier que Wave est activé :

   ```sql
   SELECT * FROM payment_providers WHERE provider_code = 'wave';
   ```

2. Exécuter :
   ```bash
   node configure_wave_provider.mjs
   ```

### URL invalide générée

1. Vérifier le template :

   ```sql
   SELECT config->>'payment_link_template'
   FROM payment_providers
   WHERE provider_code = 'wave';
   ```

2. S'assurer qu'il contient `{amount}`

### Transaction reste en pending

Wave ne fournit pas de callback automatique. Solutions :

- Vérifier manuellement depuis l'admin
- Implémenter webhook Wave
- Ajouter un système de polling

## 📝 Scripts disponibles

| Script                                               | Description                  |
| ---------------------------------------------------- | ---------------------------- |
| `configure_wave_provider.mjs`                        | Configure et active Wave     |
| `test_wave_integration.mjs`                          | Teste l'intégration complète |
| `supabase/migrations/20251212_add_wave_provider.sql` | Migration SQL                |

## ✅ Checklist de déploiement

- [ ] Migration appliquée
- [ ] Wave activé depuis l'admin
- [ ] Lien de paiement testé
- [ ] Transaction de test créée
- [ ] URL générée correctement
- [ ] Documentation lue
- [ ] Équipe formée sur validation manuelle
- [ ] Monitoring configuré

## 🔐 Sécurité

1. **Validation montant** : Le montant est toujours vérifié côté serveur
2. **Transaction tracking** : Chaque paiement créé une transaction
3. **RLS activé** : Seuls admins peuvent modifier les providers
4. **Logs audités** : Toutes les modifications sont loggées

## 📞 Support

Pour toute question :

1. Consultez les logs : `payment_provider_logs`
2. Testez avec : `node test_wave_integration.mjs`
3. Vérifiez l'admin : `/admin/payment-providers`

---

**Version:** 1.0.0  
**Date:** 12 Décembre 2024  
**Status:** ✅ Production Ready
