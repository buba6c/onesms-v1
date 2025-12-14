# 🚨 CORRECTION URGENTE - Sync ne fonctionne pas

## Problèmes identifiés

### 1. ❌ CORS Error sur sync_logs

```
Fetch API cannot load .../sync_logs due to access control checks
```

**Cause**: Policy RLS bloque l'accès public

### 2. ❌ Sync error: TypeError: Load failed

**Cause**: Edge Function pas déployée ou API key manquante

### 3. ❌ 404/500 sur logos Clearbit

**Cause**: Trop de services obscurs essaient de charger des logos

### 4. ❌ Affiche "10 services, 3 numéros, 0 numbers"

**Cause**: Données de test, pas de vraie sync avec 5sim

---

## 🔧 SOLUTION IMMÉDIATE

### Étape 1: Exécuter FIX_CORS_NOW.sql

```sql
-- COPIER TOUT LE CONTENU DE FIX_CORS_NOW.sql
-- Aller sur: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql
-- Coller et cliquer "RUN"
```

Ce script va :

- ✅ Corriger les policies RLS sur sync_logs
- ✅ Permettre l'accès public en lecture
- ✅ Créer la table sync_logs si manquante

### Étape 2: Vérifier l'Edge Function

```bash
# Voir si la fonction est déployée
supabase functions list

# Si pas déployée, déployer:
cd "/Users/mac/Desktop/ONE SMS V1"
supabase functions deploy sync-5sim --no-verify-jwt
```

### Étape 3: Configurer l'API Key 5sim

```bash
# Dans Supabase Dashboard → Project Settings → Edge Functions → Secrets
# Ajouter:
FIVE_SIM_API_KEY=eyJhbGc...votre_token_5sim

# Ou via CLI:
supabase secrets set FIVE_SIM_API_KEY=eyJhbGc...
```

### Étape 4: Rebuild et redémarrer l'app

```bash
cd "/Users/mac/Desktop/ONE SMS V1"
npm run build
pm2 restart all
```

### Étape 5: Tester la sync

1. Ouvrir http://localhost:3000
2. Login admin
3. Admin → Services
4. Cliquer "Sync avec 5sim"
5. Ouvrir console (F12) pour voir les logs

---

## 📊 Vérifications après fix

### Dans la console du navigateur:

**AVANT le fix**:

```
❌ CORS error sur sync_logs
❌ Load failed
❌ 404 sur logos obscurs
```

**APRÈS le fix**:

```
✅ 📊 [DASHBOARD] Services récupérés: 1000+
✅ ✅ [DASHBOARD] Services mappés: 1000+
✅ 📈 [DASHBOARD] Total numéros: 2,500,000+
✅ Logos seulement pour services populaires
```

### Dans Supabase Dashboard:

```sql
-- Vérifier les données
SELECT COUNT(*) FROM services;  -- Devrait être 1000+
SELECT COUNT(*) FROM countries;  -- Devrait être 150+
SELECT COUNT(*) FROM pricing_rules;  -- Devrait être 100,000+
SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 5;
```

---

## 🐛 Diagnostics possibles

### Si encore CORS error

**Vérifier les policies**:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'sync_logs';
```

Devrait montrer:

- `Anyone can read sync logs` (SELECT)
- `Service role can create sync logs` (INSERT)

### Si "Load failed" persiste

**Vérifier Edge Function**:

```bash
# Logs de la fonction
supabase functions logs sync-5sim
```

**Vérifier les secrets**:

```bash
supabase secrets list
```

Devrait montrer:

- `FIVE_SIM_API_KEY`

### Si sync réussit mais 0 services

**Vérifier l'API 5sim**:

```bash
# Test manuel
curl "https://5sim.net/v1/guest/prices" -H "Accept: application/json"
```

Devrait retourner un gros JSON avec tous les services/pays/prix.

---

## ✅ Checklist de résolution

- [ ] **FIX_CORS_NOW.sql exécuté** dans Supabase Dashboard
- [ ] **Edge Function déployée** (`supabase functions deploy sync-5sim`)
- [ ] **API Key configurée** (`FIVE_SIM_API_KEY` dans secrets)
- [ ] **App rebuilt** (`npm run build`)
- [ ] **PM2 redémarré** (`pm2 restart all`)
- [ ] **Sync testée** (Admin → Services → "Sync avec 5sim")
- [ ] **Console vérifiée** (F12 → voir logs de sync)
- [ ] **Données vérifiées** (services > 1000, countries > 150)

---

## 🎯 Résultat attendu

### Avant:

```
Services: 10 (données de test)
Numéros: 3 par service
"0 numbers" affiché
CORS errors partout
```

### Après:

```
Services: 1000+ (vrais services 5sim)
Numéros: Vrais nombres (ex: Instagram 150,000+)
Pas de CORS errors
Logos uniquement pour services populaires (pas de 404/500)
```

---

## 📞 Support

Si après tous ces steps ça ne marche pas:

1. **Copier les logs d'erreur** de la console (F12)
2. **Copier les logs Edge Function** (`supabase functions logs sync-5sim`)
3. **Vérifier Supabase Dashboard** → Logs → API
4. **Vérifier** que l'API key 5sim est valide (tester avec curl)

---

**Prochaine action**: Exécute **FIX_CORS_NOW.sql** maintenant dans Supabase Dashboard !
