# 🔧 Correction - Affichage des numéros expirés

## 🎯 Problème identifié

### Symptôme
Les numéros expirés ou déjà utilisés continuent à s'afficher sur le dashboard après expiration.

### Cause racine
Dans `src/pages/DashboardPage.tsx` lignes 146-150 :

```typescript
const { data, error } = await supabase
  .from('activations')
  .select('*')
  .eq('user_id', user.id)
  .in('status', ['pending', 'waiting'])  // ❌ Problème ici
  .order('created_at', { ascending: false });
```

Le problème : Les activations expirées ont leur statut qui reste `'pending'` ou `'waiting'` en base de données, même après expiration.

---

## 🔧 Solutions

### Solution 1: Filtrer par date d'expiration (RECOMMANDÉ)

**Modifier la requête pour exclure les numéros expirés:**

```typescript
const { data, error } = await supabase
  .from('activations')
  .select('*')
  .eq('user_id', user.id)
  .in('status', ['pending', 'waiting'])
  .gt('expires_at', new Date().toISOString())  // ✅ Seulement les non expirés
  .order('created_at', { ascending: false });
```

---

### Solution 2: Mettre à jour le statut en DB (PLUS PROPRE)

**Créer une Edge Function qui nettoie automatiquement:**

```typescript
// supabase/functions/cleanup-expired-activations/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Mettre à jour les activations expirées
  const { data, error } = await supabase
    .from('activations')
    .update({ status: 'timeout' })
    .in('status', ['pending', 'waiting'])
    .lt('expires_at', new Date().toISOString())

  return new Response(
    JSON.stringify({ 
      success: !error,
      updated: data?.length || 0
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Appeler cette fonction toutes les 5 minutes via Supabase Cron.**

---

### Solution 3: Filtrer côté frontend (TEMPORAIRE)

**Dans DashboardPage.tsx, après la récupération:**

```typescript
return data?.map(act => {
  const expiresAt = new Date(act.expires_at).getTime();
  const now = Date.now();
  const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

  // ✅ Ne pas inclure les numéros expirés
  if (timeRemaining === 0) {
    return null;
  }

  return {
    id: act.id,
    orderId: act.order_id,
    // ... rest of the mapping
  } as ActiveNumber;
}).filter(Boolean) || [];  // ✅ Supprimer les null
```

---

## 🚀 Application de la correction

### Correction rapide (Frontend uniquement)

**Fichier:** `src/pages/DashboardPage.tsx`

**Ligne 146-150**, remplacer par:

```typescript
const { data, error } = await supabase
  .from('activations')
  .select('*')
  .eq('user_id', user.id)
  .in('status', ['pending', 'waiting'])
  .gt('expires_at', new Date().toISOString())  // ✅ Ajout de ce filtre
  .order('created_at', { ascending: false });
```

**Rebuild:**
```bash
cd "/Users/mac/Desktop/ONE SMS V1"
npm run build
pm2 restart ecosystem.config.cjs
```

---

### Correction complète (Backend + Frontend)

#### Étape 1: Créer l'Edge Function de nettoyage

```bash
cd "/Users/mac/Desktop/ONE SMS V1"
mkdir -p supabase/functions/cleanup-expired-activations
```

**Créer:** `supabase/functions/cleanup-expired-activations/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.log('🧹 [CLEANUP] Nettoyage des activations expirées...')

    // Mettre à jour les activations expirées
    const { data, error } = await supabase
      .from('activations')
      .update({ 
        status: 'timeout',
        updated_at: new Date().toISOString()
      })
      .in('status', ['pending', 'waiting'])
      .lt('expires_at', new Date().toISOString())
      .select()

    if (error) {
      console.error('❌ [CLEANUP] Erreur:', error)
      throw error
    }

    const count = data?.length || 0
    console.log(`✅ [CLEANUP] ${count} activations nettoyées`)

    // Supprimer les transactions pending associées
    if (count > 0) {
      const activationIds = data.map(act => act.id)
      
      await supabase
        .from('transactions')
        .delete()
        .in('metadata->>activation_id', activationIds)
        .eq('status', 'pending')
      
      console.log(`✅ [CLEANUP] Transactions pending supprimées`)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        cleaned: count,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error: any) {
    console.error('❌ [CLEANUP] Exception:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
```

#### Étape 2: Déployer la fonction

```bash
supabase functions deploy cleanup-expired-activations --project-ref htfqmamvmhdoixqcbbbw
```

#### Étape 3: Configurer le Cron (dans Supabase Dashboard)

1. Aller dans Database → Cron Jobs
2. Créer un nouveau job:

```sql
-- Nettoyer les activations expirées toutes les 5 minutes
SELECT cron.schedule(
  'cleanup-expired-activations',
  '*/5 * * * *',  -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/cleanup-expired-activations',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

#### Étape 4: Appliquer le filtre frontend

Même chose que Solution 1 ci-dessus.

---

## 🧪 Test de la correction

### Test 1: Vérifier le filtre frontend

1. Ouvrir http://localhost:3000
2. Dashboard → Acheter un numéro test
3. Attendre expiration (15-20 minutes)
4. Rafraîchir la page (F5)
5. ✅ Le numéro expiré ne doit plus apparaître

### Test 2: Vérifier le nettoyage backend

```sql
-- Avant nettoyage
SELECT COUNT(*) FROM activations 
WHERE status IN ('pending', 'waiting') 
AND expires_at < NOW();

-- Appeler la fonction
-- (ou attendre 5 minutes si cron configuré)

-- Après nettoyage
SELECT COUNT(*) FROM activations 
WHERE status = 'timeout' 
AND expires_at < NOW();
```

---

## 📊 Requêtes SQL utiles

### Compter les activations par statut

```sql
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_count
FROM activations
GROUP BY status
ORDER BY count DESC;
```

### Lister les numéros expirés toujours actifs

```sql
SELECT 
  id,
  order_id,
  phone,
  status,
  created_at,
  expires_at,
  (expires_at < NOW()) as is_expired
FROM activations
WHERE status IN ('pending', 'waiting')
AND expires_at < NOW()
ORDER BY created_at DESC
LIMIT 20;
```

### Nettoyer manuellement

```sql
-- Mettre à jour tous les expirés en timeout
UPDATE activations
SET status = 'timeout',
    updated_at = NOW()
WHERE status IN ('pending', 'waiting')
AND expires_at < NOW();

-- Supprimer les transactions pending associées
DELETE FROM transactions
WHERE status = 'pending'
AND metadata->>'activation_id' IN (
  SELECT id::text FROM activations 
  WHERE status = 'timeout'
);
```

---

## ✅ Checklist

- [ ] Appliquer le filtre dans DashboardPage.tsx
- [ ] Créer la fonction cleanup-expired-activations
- [ ] Déployer la fonction
- [ ] Configurer le cron job (optionnel)
- [ ] Nettoyer manuellement les anciens expirés
- [ ] Rebuild frontend
- [ ] Restart PM2
- [ ] Tester

---

## 🎯 Action immédiate

**Pour corriger rapidement:**

```bash
cd "/Users/mac/Desktop/ONE SMS V1"

# 1. Appliquer le patch
cat > temp_fix.patch << 'EOF'
--- a/src/pages/DashboardPage.tsx
+++ b/src/pages/DashboardPage.tsx
@@ -147,6 +147,7 @@
       .select('*')
       .eq('user_id', user.id)
       .in('status', ['pending', 'waiting'])
+      .gt('expires_at', new Date().toISOString())
       .order('created_at', { ascending: false });
 
     if (error) {
EOF

patch -p1 < temp_fix.patch

# 2. Rebuild
npm run build

# 3. Restart
pm2 restart ecosystem.config.cjs

# 4. Cleanup
rm temp_fix.patch

echo "✅ Correction appliquée !"
```

---

**Date**: 21 novembre 2025  
**Statut**: Solution complète fournie  
**Priorité**: MOYENNE (affichage uniquement, pas critique)
