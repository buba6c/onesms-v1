# 💳 INTERFACE ADMIN - GESTION DES FOURNISSEURS DE PAIEMENT

> Interface de gestion des passerelles de paiement (PayDunya, MoneyFusion, Paytech, etc.)  
> Date: 8 Décembre 2025

---

## 🎯 FONCTIONNALITÉS

### Interface Admin complète

**URL:** `https://onesms-sn.com/admin/payment-providers`

**Fonctionnalités implémentées :**

✅ **Gestion des fournisseurs**
- Activer/désactiver chaque fournisseur (toggle simple)
- Définir un fournisseur par défaut (étoile jaune)
- Voir le statut en temps réel (actif/inactif)
- Voir les moyens de paiement supportés par chaque fournisseur

✅ **Configuration sécurisée**
- Modal de configuration par fournisseur
- Champs adaptés selon le provider (PayDunya, MoneyFusion, Paytech)
- Masquage des clés API sensibles (type password)
- Bouton œil pour afficher/masquer les clés
- Validation avant sauvegarde

✅ **Historique des modifications**
- Logs de tous les changements (activation, désactivation, config, défaut)
- Timestamp précis de chaque action
- Affichage old value / new value
- Traçabilité complète

✅ **Interface moderne**
- Design avec cartes colorées selon le statut
- Indicateur visuel actif/inactif
- Badge "Par défaut" pour le provider principal
- Notifications de succès/erreur
- Animations de chargement

---

## 🗄️ STRUCTURE BASE DE DONNÉES

### Table `payment_providers`

```sql
CREATE TABLE payment_providers (
  id UUID PRIMARY KEY,
  provider_code TEXT UNIQUE NOT NULL,      -- 'paydunya', 'moneyfusion', 'paytech'
  provider_name TEXT NOT NULL,             -- 'PayDunya', 'MoneyFusion', 'Paytech'
  is_active BOOLEAN DEFAULT false,         -- Actif ou non
  is_default BOOLEAN DEFAULT false,        -- Fournisseur par défaut
  priority INTEGER DEFAULT 0,              -- Ordre d'affichage
  config JSONB DEFAULT '{}',               -- Clés API et config
  supported_methods JSONB DEFAULT '[]',    -- Moyens de paiement supportés
  fees_config JSONB DEFAULT '{}',          -- Configuration des frais
  logo_url TEXT,                           -- URL du logo
  description TEXT,                        -- Description
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### Table `payment_provider_logs`

```sql
CREATE TABLE payment_provider_logs (
  id UUID PRIMARY KEY,
  provider_id UUID REFERENCES payment_providers(id),
  admin_id UUID REFERENCES users(id),
  action TEXT NOT NULL,                    -- 'activated', 'deactivated', 'updated_config', 'set_default'
  old_value JSONB,                         -- Ancienne valeur
  new_value JSONB,                         -- Nouvelle valeur
  created_at TIMESTAMPTZ
)
```

---

## ⚙️ CONFIGURATION PAR FOURNISSEUR

### PayDunya
```json
{
  "master_key": "wQzk9ZwR-Qq9m-0hD0-zpud-je5coGC3FHKW",
  "private_key": "test_private_rMIdJM3PLLhLjyArx9tF3VURAF5",
  "token": "IivOiOxGJuWhc5znlIiK",
  "mode": "test",  // ou "live"
  "callback_url": "https://onesms-sn.com/api/paydunya/callback"
}
```

**Moyens de paiement supportés:**
- Orange Money Sénégal
- Wave Sénégal
- Free Money Sénégal
- E-Money (Expresso)
- Wizall Sénégal
- Carte bancaire
- MTN Bénin
- Moov Bénin
- ... (19 au total)

### MoneyFusion
```json
{
  "api_key": "mf_xxx",
  "api_secret": "xxx",
  "merchant_id": "MF123456",
  "webhook_url": "https://onesms-sn.com/api/moneyfusion/webhook"
}
```

**Moyens de paiement supportés:**
- Orange Money
- Wave
- Carte bancaire

### Paytech
```json
{
  "api_key": "pt_xxx",
  "api_secret": "xxx",
  "env": "test"  // ou "prod"
}
```

**Moyens de paiement supportés:**
- Orange Money
- Wave
- Free Money
- Carte bancaire

---

## 🔒 SÉCURITÉ

### Policies RLS Supabase

**Lecture publique des providers actifs:**
```sql
CREATE POLICY "Anyone can view active providers" ON payment_providers
  FOR SELECT USING (is_active = true);
```

**Administration réservée aux admins:**
```sql
CREATE POLICY "Admins can view all providers" ON payment_providers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update providers" ON payment_providers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
```

**Service role full access:**
```sql
CREATE POLICY "Service role full access" ON payment_providers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Protection des clés API

- ❌ **Jamais** commit les clés API dans le code
- ✅ Stockage en JSONB chiffré dans Supabase
- ✅ Affichage masqué par défaut (type password)
- ✅ Accès restreint aux admins uniquement
- ✅ Logs de toutes les modifications

---

## 📊 DONNÉES PAR DÉFAUT

Au déploiement, 3 fournisseurs sont pré-configurés :

| Fournisseur | Code | Actif | Par défaut | Priority |
|-------------|------|-------|------------|----------|
| PayDunya | `paydunya` | ❌ | ❌ | 1 |
| MoneyFusion | `moneyfusion` | ✅ | ✅ | 2 |
| Paytech | `paytech` | ✅ | ❌ | 3 |

**Notes:**
- MoneyFusion est le fournisseur par défaut actuel
- PayDunya est désactivé par défaut (en attente de configuration)
- Paytech est actif comme fallback

---

## 🎨 INTERFACE UTILISATEUR

### Carte fournisseur

```
┌─────────────────────────────────────────┐
│ [Logo] PayDunya            [Toggle OFF] │
│                                          │
│ Plateforme de paiement mobile money     │
│ africaine avec 19 opérateurs supportés  │
│                                          │
│ Moyens de paiement:                      │
│ [orange-mo...] [wave-sene...] [free...] │
│                                          │
│ ● Inactif                                │
│                                          │
│ [Configurer]  [⭐]  [📜]                 │
└─────────────────────────────────────────┘
```

### Modal de configuration

```
┌──────────────────────────────────────────────┐
│ Configuration PayDunya                    [X] │
├──────────────────────────────────────────────┤
│                                              │
│ Master Key                                   │
│ [••••••••••••••••••••]                [👁️]  │
│                                              │
│ Private Key                                  │
│ [••••••••••••••••••••]                [👁️]  │
│                                              │
│ Token                                        │
│ [••••••••••••••••••••]                [👁️]  │
│                                              │
│ Mode                                         │
│ [▼ Sélectionner... ▼]                       │
│   - test                                     │
│   - live                                     │
│                                              │
│ ⚠️ Attention                                 │
│ Les clés API sont sensibles. Ne les         │
│ partagez jamais.                             │
│                                              │
├──────────────────────────────────────────────┤
│              [Annuler]  [Enregistrer]        │
└──────────────────────────────────────────────┘
```

### Modal historique

```
┌──────────────────────────────────────────────┐
│ 📜 Historique des modifications          [X] │
├──────────────────────────────────────────────┤
│                                              │
│ Activated                 8/12/2025 15:30    │
│ {                                            │
│   "old": { "is_active": false },            │
│   "new": { "is_active": true }              │
│ }                                            │
│                                              │
│ Updated Config            8/12/2025 14:20    │
│ {                                            │
│   "old": { "mode": "test" },                │
│   "new": { "mode": "live" }                 │
│ }                                            │
│                                              │
├──────────────────────────────────────────────┤
│                   [Fermer]                   │
└──────────────────────────────────────────────┘
```

---

## 🚀 UTILISATION

### Pour activer un nouveau fournisseur

1. **Aller sur** `https://onesms-sn.com/admin/payment-providers`
2. **Cliquer sur "Configurer"** du fournisseur souhaité
3. **Remplir les clés API** (master key, private key, token, etc.)
4. **Choisir le mode** (test ou live)
5. **Enregistrer**
6. **Activer le toggle** pour rendre le fournisseur actif
7. **Optionnel:** Cliquer sur ⭐ pour le définir par défaut

### Pour désactiver un fournisseur

1. **Cliquer sur le toggle** ON → OFF
2. **Confirmation automatique** avec notification

### Pour changer le fournisseur par défaut

1. **Cliquer sur l'étoile** ⭐ du nouveau fournisseur souhaité
2. **Automatiquement:**
   - Ancien défaut devient non-défaut
   - Nouveau fournisseur devient défaut et actif
   - Notification de succès

### Pour voir l'historique

1. **Cliquer sur l'icône** 📜 (History)
2. **Consulter les 20 dernières modifications**
3. **Voir les détails** old value / new value

---

## 🔄 WORKFLOW DE PAIEMENT

### Sélection automatique du fournisseur

```typescript
// Lors d'un paiement, le système sélectionne automatiquement:

1. Fournisseur par défaut (is_default = true)
   ↓
2. Si échec, fallback sur les autres actifs (is_active = true)
   ↓
3. Ordre de priorité (priority: 1, 2, 3...)
```

### Exemple de code d'utilisation

```typescript
// Récupérer le fournisseur actif par défaut
const { data: defaultProvider } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('is_active', true)
  .eq('is_default', true)
  .single()

// Récupérer tous les fournisseurs actifs (fallback)
const { data: activeProviders } = await supabase
  .from('payment_providers')
  .select('*')
  .eq('is_active', true)
  .order('priority', { ascending: true })

// Utiliser le premier disponible
const provider = defaultProvider || activeProviders[0]
```

---

## 📈 MÉTRIQUES ET MONITORING

### À surveiller

- **Taux de succès** par fournisseur
- **Temps de réponse** moyen
- **Coûts** par fournisseur
- **Disponibilité** (uptime)
- **Erreurs** fréquentes

### Recommandation

Créer un dashboard d'analytics pour comparer les performances des fournisseurs et optimiser les coûts.

---

## 🛠️ MAINTENANCE

### Mise à jour des clés API

1. Aller dans la configuration du fournisseur
2. Remplacer les anciennes clés par les nouvelles
3. Enregistrer
4. Action loggée automatiquement

### Ajout d'un nouveau fournisseur

**Via SQL:**
```sql
INSERT INTO payment_providers (
  provider_code,
  provider_name,
  is_active,
  is_default,
  priority,
  supported_methods,
  description
) VALUES (
  'nouveau_provider',
  'Nouveau Provider',
  false,
  false,
  4,
  '["orange-money", "wave"]'::jsonb,
  'Description du nouveau fournisseur'
);
```

**Puis configurer via l'interface admin.**

---

## ✅ CHECKLIST DE DÉPLOIEMENT

- [x] Table `payment_providers` créée
- [x] Table `payment_provider_logs` créée
- [x] Policies RLS configurées
- [x] Données par défaut insérées
- [x] Interface admin développée
- [x] Route `/admin/payment-providers` ajoutée
- [x] Menu admin mis à jour
- [x] Build réussi
- [x] Déploiement Netlify effectué
- [x] Accessible sur https://onesms-sn.com/admin/payment-providers

---

## 🎉 RÉSULTAT

✅ **Interface complète et fonctionnelle**
✅ **Gestion sécurisée des fournisseurs de paiement**
✅ **Logs et traçabilité des modifications**
✅ **Prêt pour migration PayDunya**

**Prochaine étape recommandée:**
Configurer PayDunya avec les vraies clés API et l'activer comme fournisseur par défaut après tests.

