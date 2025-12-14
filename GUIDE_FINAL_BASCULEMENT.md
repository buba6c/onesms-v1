# 🚀 GUIDE DE BASCULEMENT VERS COOLIFY

## ✅ État actuel de la migration: 83%

### 📊 Ce qui est fait:
- ✅ 194,733/194,763 lignes de données (99.98%)
- ✅ 34 migrations SQL appliquées
- ✅ 4 Edge Functions critiques déployées (status 503 = déployées mais secrets manquants)
- ✅ 3 cron jobs configurés et actifs
- ✅ Schéma complet de la base de données

### ⚠️  Ce qui reste:
- ⚠️  43 lignes balance_operations (contraintes FK avec rentals)
- ⚠️  4 secrets à configurer manuellement
- ⚠️  57 Edge Functions supplémentaires à déployer (optionnel au démarrage)

---

## 🎯 ÉTAPE 1: Finaliser l'import des données (Optionnel)

```bash
node finalize_migration.mjs
```

Les 43 lignes manquantes ont probablement des contraintes de clés étrangères avec des `rentals` qui n'existent pas. Ce n'est pas bloquant pour le démarrage.

---

## 🔑 ÉTAPE 2: Configurer les secrets sur Coolify (CRITIQUE)

### Via le Dashboard Coolify:

1. **Ouvrir**: http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io
2. **Aller dans**: Settings → Secrets (ou Edge Functions → Configure)
3. **Ajouter les variables suivantes**:

```env
# Supabase (déjà dans Coolify mais vérifier)
SUPABASE_URL=http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io
SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoiYW5vbiJ9.sQx2T_ELM-QNRFx2tpDH7XWLyjYlFt1HORE_qjjwrNM
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.1yLw9EuRiBBqodz_M9XwyQlOzzdSwgjzX-1en5MSnBg

# SMS Activate (à récupérer depuis votre .env)
SMS_ACTIVATE_API_KEY=<VOTRE_CLE>

# PayDunya (à récupérer depuis votre .env ou dashboard PayDunya)
PAYDUNYA_MASTER_KEY=<VOTRE_CLE>
PAYDUNYA_PRIVATE_KEY=<VOTRE_CLE>
PAYDUNYA_TOKEN=<VOTRE_TOKEN>
PAYDUNYA_MODE=test

# MoneyFusion (à récupérer depuis votre .env)
MONEYFUSION_API_URL=<VOTRE_URL>
MONEYFUSION_MERCHANT_ID=<VOTRE_ID>

# Moneroo (optionnel au démarrage)
MONEROO_PUBLIC_KEY=<VOTRE_CLE>
MONEROO_WEBHOOK_SECRET=<VOTRE_SECRET>

# PayTech (optionnel au démarrage)
PAYTECH_API_KEY=<VOTRE_CLE>
PAYTECH_API_SECRET=<VOTRE_SECRET>

# 5SIM (optionnel)
FIVESIM_API_KEY=<VOTRE_CLE>
```

**Pour récupérer vos clés actuelles**:
```bash
grep -E "SMS_ACTIVATE|PAYDUNYA|MONEYFUSION|MONEROO|PAYTECH" .env
```

---

## 📦 ÉTAPE 3: Déployer les Edge Functions restantes (Optionnel)

Les 4 fonctions critiques sont déjà déployées mais retournent 503 (erreur normale sans secrets).

Pour déployer toutes les autres fonctions:

### Option A: Via Supabase CLI (Recommandé si CLI fonctionne avec Coolify)
```bash
# Configurer le CLI
export SUPABASE_URL=http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io
export SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAi...

# Déployer toutes les fonctions
supabase functions deploy --all

# Ou une par une
supabase functions deploy paydunya-webhook
supabase functions deploy moneyfusion-webhook
# etc...
```

### Option B: Via le Dashboard Coolify (Manuel)
1. Dashboard → Edge Functions → New Function
2. Copier le code de `supabase/functions/<nom>/index.ts`
3. Coller et Deploy

**Fonctions à déployer en priorité après les 4 critiques**:
- `paydunya-webhook`
- `moneyfusion-webhook`
- `moneroo-webhook`
- `paytech-ipn`
- `webhook-sms-activate`
- `sync-services-unified`
- `get-providers-status`

---

## 🔄 ÉTAPE 4: Basculer le frontend vers Coolify

### 1. Mettre à jour .env.coolify avec les bonnes valeurs

```bash
cat > .env.coolify << 'EOF'
# Supabase Coolify
VITE_SUPABASE_URL=http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io
VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2NTIxNDUyMCwiZXhwIjo0OTIwODg4MTIwLCJyb2xlIjoiYW5vbiJ9.sQx2T_ELM-QNRFx2tpDH7XWLyjYlFt1HORE_qjjwrNM

# APIs externes (copier depuis .env actuel)
VITE_SMS_ACTIVATE_API_URL=...
VITE_PAYTECH_API_KEY=...
# etc...
EOF
```

### 2. Sauvegarder l'ancien .env

```bash
cp .env .env.supabase-cloud-backup
```

### 3. Basculer vers Coolify

```bash
cp .env.coolify .env
```

### 4. Tester en local

```bash
npm run dev
```

**Tests à faire**:
- [ ] Page d'accueil charge
- [ ] Login fonctionne
- [ ] Liste des services s'affiche
- [ ] Acheter une activation test
- [ ] Vérifier le wallet balance

### 5. Si tout fonctionne, déployer

```bash
npm run build
netlify deploy --prod
```

---

## 🔍 ÉTAPE 5: Vérifications post-migration

### Vérifier les cron jobs
```bash
sshpass -p 'Bouba@2307##' ssh root@46.202.171.108 "docker exec -i supabase-db-h888cc0ck4w4o0kgw4kg84ks psql -U postgres -d postgres -c 'SELECT jobname, last_run_status FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;'"
```

### Vérifier les logs des Edge Functions
Dashboard Coolify → Edge Functions → Logs

### Tester un paiement PayDunya
1. Frontend → Recharger le compte
2. Choisir PayDunya
3. Montant test: 100 FCFA
4. Vérifier la redirection vers PayDunya sandbox
5. Compléter le paiement test
6. Vérifier que le crédit est ajouté

### Tester un achat SMS
1. Choisir un service (ex: WhatsApp)
2. Sélectionner un pays
3. Acheter une activation
4. Vérifier que le numéro est reçu
5. Vérifier que le SMS arrive

---

## 📨 ÉTAPE 6: Mettre à jour les webhooks externes

### PayDunya
1. Dashboard: https://paydunya.com/dashboard/webhooks
2. URL: `http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/functions/v1/paydunya-webhook`

### MoneyFusion
1. Dashboard: https://moneyfusion.com/settings/webhooks
2. URL: `http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/functions/v1/moneyfusion-webhook`

### Moneroo
1. Dashboard: https://moneroo.com/dashboard/webhooks
2. URL: `http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/functions/v1/moneroo-webhook`

### PayTech
1. Dashboard: https://paytech.sn/dashboard
2. URL IPN: `http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/functions/v1/paytech-ipn`

### SMS Activate
1. Dashboard: https://sms-activate.org/en/api2
2. Webhook URL: `http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/functions/v1/webhook-sms-activate`

---

## ⚠️  POINTS IMPORTANTS

### Performance
- Le status 503 sur les Edge Functions est NORMAL tant que les secrets ne sont pas configurés
- Une fois les secrets ajoutés, les fonctions retourneront 200/400/401 selon la requête

### Sécurité
- ⚠️  L'URL Coolify est en HTTP (pas HTTPS)
- Pour la production, configurez un nom de domaine avec HTTPS:
  - Acheter un domaine (ex: onesms.app)
  - Le pointer vers 46.202.171.108
  - Configurer Caddy/Nginx reverse proxy avec Let's Encrypt
  
### Monitoring
- Vérifier les logs quotidiennement les premiers jours
- Surveiller les cron jobs
- Vérifier les webhooks reçus

---

## 🆘 EN CAS DE PROBLÈME

### Revenir à Supabase Cloud
```bash
cp .env.supabase-cloud-backup .env
npm run dev
```

### Vérifier la connexion Coolify
```bash
curl http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/rest/v1/
```

### Redémarrer les services Coolify
```bash
sshpass -p 'Bouba@2307##' ssh root@46.202.171.108 "docker restart supabase-kong-h888cc0ck4w4o0kgw4kg84ks"
```

---

## ✅ CHECKLIST FINALE

- [ ] Données importées (194,733/194,763 lignes)
- [ ] Migrations SQL appliquées
- [ ] Secrets configurés sur Coolify
- [ ] Edge Functions critiques déployées
- [ ] Cron jobs actifs
- [ ] Frontend testé en local avec Coolify
- [ ] Webhooks externes mis à jour
- [ ] Déploiement production effectué
- [ ] Tests de paiement réussis
- [ ] Tests d'achat SMS réussis

**Une fois tout validé, vous pouvez désactiver Supabase Cloud!** 🎉
