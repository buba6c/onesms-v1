# 🚨 PROBLÈME: SMS ne s'affichent pas sur la plateforme

## ✅ CAUSE RACINE IDENTIFIÉE

**Row Level Security (RLS)** bloque les insertions dans la table `activations`.

### Preuve
```
Code: 42501
Message: new row violates row-level security policy for table "activations"
```

## 🔧 SOLUTION IMMÉDIATE

### Étape 1: Désactiver RLS (temporaire)

Ouvrez **Supabase Dashboard SQL Editor** et exécutez:

```sql
-- Désactiver RLS
ALTER TABLE activations DISABLE ROW LEVEL SECURITY;

-- Ajouter colonnes manquantes
ALTER TABLE activations ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE activations ADD COLUMN IF NOT EXISTS charged BOOLEAN DEFAULT FALSE;

-- Activer Realtime pour WebSocket
ALTER PUBLICATION supabase_realtime ADD TABLE activations;

-- Test insertion
INSERT INTO activations (
  user_id,
  order_id,
  phone,
  service_code,
  country_code,
  operator,
  price,
  status,
  expires_at,
  provider
) VALUES (
  'ea4eb96d-5ab1-48ee-aec0-a0f2cb09c388',
  'test_' || extract(epoch from now()),
  '+6289518249636',
  'whatsapp',
  'indonesia',
  'any',
  15.5,
  'pending',
  now() + interval '20 minutes',
  'sms-activate'
) RETURNING id, phone, status;
```

### Étape 2: Vérifier le fonctionnement

Après avoir exécuté le SQL ci-dessus, testez:

```bash
node test_manual_activation_sync.mjs
```

Vous devriez voir:
```
✅ Activation créée
✅ SMS ajouté
✅ Activation visible
✅ Frontend verrait 1 activation(s)
```

### Étape 3: Tester une vraie activation

1. Ouvrez votre plateforme: http://localhost:3002
2. Connectez-vous avec l'utilisateur test
3. Sélectionnez un service (WhatsApp, Google, etc.)
4. Choisissez Indonesia
5. Cliquez "Activate"
6. **L'activation devrait se créer dans la DB**
7. **Le cron job vérifiera automatiquement le SMS** (toutes les 30s)
8. **Le WebSocket notifiera le frontend** quand le SMS arrive
9. **Le SMS s'affichera instantanément**

## 📊 ARCHITECTURE DE SYNCHRONISATION

### Système multi-niveaux

```
1. User clique "Activate"
   ↓
2. buy-sms-activate-number crée activation (status: pending)
   ↓
3. Trois systèmes parallèles vérifient le SMS:
   
   A. Frontend Polling (10s)
      - useQuery refetchInterval: 10000
      - Recharge activations régulièrement
   
   B. Cron Job (30s-1min)
      - cron-check-pending-sms
      - Appelle check-sms-activate-status
      - Met à jour la DB avec sms_code
   
   C. WebSocket Realtime (0s)
      - useRealtimeSms hook
      - Écoute UPDATE sur activations
      - Notifie instantanément quand SMS arrive
   
4. SMS détecté → DB mise à jour (status: received, sms_code: XXX)
   ↓
5. WebSocket trigger → Frontend notifié
   ↓
6. refetchActivations() → Affichage SMS instantané
```

## 🐛 POURQUOI ÇA NE MARCHAIT PAS

### Problème 1: RLS bloque insertions
- `buy-sms-activate-number` ne peut pas créer d'activations
- Table `activations` reste vide
- Aucun SMS à synchroniser

### Problème 2: Policies incorrectes
- Policies trop restrictives
- Service role bloqué
- Anonymous users bloqués

### Problème 3: Realtime pas activé
- WebSocket ne fonctionnait pas
- Pas de notifications instantanées

## ✅ APRÈS LE FIX

1. ✅ **RLS désactivé** → Insertions possibles
2. ✅ **Realtime activé** → WebSocket fonctionne
3. ✅ **Colonnes ajoutées** → external_id, charged
4. ✅ **Cron job actif** → Vérifie SMS toutes les 30s
5. ✅ **WebSocket connecté** → Notifications instantanées
6. ✅ **Polling frontend** → Backup toutes les 10s

## 🔐 SÉCURITÉ (À FAIRE PLUS TARD)

Une fois que tout fonctionne, réactiver RLS avec policies correctes:

```sql
-- Réactiver RLS
ALTER TABLE activations ENABLE ROW LEVEL SECURITY;

-- Policy: Service role tout accès
CREATE POLICY "service_full_access" ON activations
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Policy: Users leurs propres activations
CREATE POLICY "users_own_activations" ON activations
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Anonymous read only
CREATE POLICY "anon_read_activations" ON activations
  FOR SELECT TO anon
  USING (true);
```

## 📝 LOGS À SURVEILLER

### Frontend (Console navigateur)
```
🔌 [REALTIME] WebSocket connecté avec succès
✅ [LOAD] Activations chargées: 3
📨 [REALTIME] SMS reçu en temps réel! { code: "358042" }
```

### Backend (Supabase Logs)
```
🚀 [BUY-SMS-ACTIVATE] Number purchased
✅ [CHECK-SMS-ACTIVATE] SMS received
💰 [CHECK-SMS-ACTIVATE] User charged
```

### Cron Job
```
{
  "checked": 12,
  "found": 2,
  "expired": 0
}
```

## 🎯 CHECKLIST DE VÉRIFICATION

- [ ] SQL exécuté dans Supabase Dashboard
- [ ] Test insertion manuelle réussit
- [ ] Activation via frontend crée une ligne dans `activations`
- [ ] Cron job détecte et met à jour les SMS
- [ ] WebSocket notifie le frontend
- [ ] SMS s'affiche instantanément sur la plateforme
- [ ] Balance débitée correctement
- [ ] Transactions créées

## 🚀 EXÉCUTION

```bash
# 1. Fix RLS
# → Copiez le SQL ci-dessus dans Supabase Dashboard

# 2. Test manuel
node test_manual_activation_sync.mjs

# 3. Test complet
node analyze_sms_sync.mjs

# 4. Ouvrir plateforme
# → http://localhost:3002
# → Tester activation réelle
```

---

**Date**: 24 novembre 2025  
**Status**: 🔧 FIX PRÊT - EN ATTENTE D'EXÉCUTION SQL
