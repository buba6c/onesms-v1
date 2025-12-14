# 🔧 SOLUTION TROUVÉE - Permissions INSERT manquantes

## Problème Identifié

La table `activations` a **RLS activé** mais **AUCUNE POLICY pour INSERT** qui fonctionne !

### Policies actuelles :

```sql
-- ✅ Lecture OK
CREATE POLICY "Users can read own activations" ON activations FOR SELECT
  USING (auth.uid() = user_id);

-- ❌ NE FONCTIONNE PAS pour INSERT depuis Edge Functions
CREATE POLICY "Service role can manage activations" ON activations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

### Pourquoi ça ne fonctionne pas ?

Dans les Edge Functions Supabase, `auth.jwt()->>'role'` ne retourne **PAS** 'service_role'.
Donc quand `buy-5sim-number` essaie de faire un INSERT, la policy bloque la requête !

### Preuve

1. L'utilisateur achète +447455944076 via le dashboard
2. `buy-5sim-number` Edge Function est appelée
3. L'achat sur 5sim réussit (l'utilisateur le confirme)
4. `buy-5sim-number` essaie de faire l'INSERT en DB :
   ```typescript
   const { data: activation, error: activationError } = await supabase
     .from('activations')
     .insert({ ... })
   ```
5. **RLS bloque l'INSERT** car aucune policy ne permet l'insertion
6. `activationError` contient l'erreur mais elle n'est PAS loggée
7. Le frontend reçoit une erreur, mais continue quand même
8. Le numéro est ajouté au state React local mais PAS en DB

## Solution

### Option 1 : Policy TO service_role (RECOMMANDÉE)

```sql
DROP POLICY IF EXISTS "Service role can manage activations" ON activations;

CREATE POLICY "Service role can manage activations"
  ON activations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Option 2 : Policy pour authenticated users

```sql
CREATE POLICY "Authenticated users can insert activations"
  ON activations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

## À FAIRE IMMÉDIATEMENT

### 1. Appliquer la migration SQL dans Supabase

Aller sur : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/editor

Exécuter ce SQL :

```sql
-- Supprimer l'ancienne policy qui ne fonctionne pas
DROP POLICY IF EXISTS "Service role can manage activations" ON activations;

-- Créer la bonne policy pour service_role
CREATE POLICY "Service role can manage activations"
  ON activations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ajouter une policy pour INSERT par les utilisateurs authentifiés
-- (au cas où buy-5sim-number utilise le token utilisateur)
CREATE POLICY "Authenticated users can insert activations"
  ON activations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Vérifier les policies
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'activations';
```

### 2. Tester un nouvel achat

1. Acheter un nouveau numéro depuis le dashboard
2. Vérifier immédiatement dans la DB :
   ```bash
   curl -s 'https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/activations?order=created_at.desc&limit=1' \
     -H "apikey: eyJh..." | jq .
   ```

### 3. Migrer les achats existants

Si l'utilisateur a déjà acheté +447455944076 et +44 7429215087 sur 5sim mais pas dans notre DB,
on peut les récupérer et les insérer manuellement :

```sql
-- Récupérer les infos depuis l'API 5sim
-- Puis insérer manuellement dans activations
INSERT INTO activations (
  user_id, order_id, phone, service_code, country_code,
  operator, price, status, expires_at, created_at
) VALUES (
  'e108c02a-2012-4043-bbc2-fb09bb11f824', -- ID de l'utilisateur
  'ORDER_ID_FROM_5SIM',
  '+447455944076',
  'google',
  'england',
  'virtual51',
  28.00,
  'received', -- Si SMS déjà reçu
  NOW() + INTERVAL '20 minutes',
  NOW()
);
```

## Résultat attendu

Après application de la migration :

- ✅ Les nouveaux achats seront enregistrés en DB
- ✅ Les numéros seront visibles même après refresh
- ✅ Le polling SMS fonctionnera correctement
- ✅ La facturation sera trackée avec le champ `charged`

## Logs à vérifier

Console navigateur devrait montrer :

```
🚀 [ACTIVATE] Début achat: { ... }
✅ [ACTIVATE] Numéro acheté: { id: ..., phone: '+44...' }
🔄 [LOAD] Chargement activations DB...
✅ [LOAD] Activations chargées: 1
```

Supabase Edge Function logs :

```
🛒 [BUY] Achat numéro: { country, product, userId }
📞 [BUY] Appel API 5sim...
✅ [BUY] Numéro acheté: { id, phone, ... }
💾 [BUY] Activation créée en DB: uuid
```
