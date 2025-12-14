# 🔧 FIX URGENT - Erreur 403 Transactions

## ❌ Problème

```
POST /rest/v1/transactions 403 (Forbidden)
```

**Cause** : La policy "Block user transaction mutations" empêche les utilisateurs de créer des transactions pour Wave payments.

## ✅ Solution (2 minutes)

### Option 1 : Via SQL Editor (RECOMMANDÉ)

1. **Ouvrir le SQL Editor de Supabase** :

   ```
   https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new
   ```

2. **Copier-coller ce code SQL** :

   ```sql
   -- Supprimer la policy bloquante
   DROP POLICY IF EXISTS "Block user transaction mutations" ON public.transactions;

   -- Créer policy pour INSERT
   CREATE POLICY "Users can create own transactions"
   ON public.transactions
   FOR INSERT
   TO authenticated
   WITH CHECK (auth.uid() = user_id);

   -- Créer policy pour UPDATE
   CREATE POLICY "Users can update own pending transactions"
   ON public.transactions
   FOR UPDATE
   TO authenticated
   USING (auth.uid() = user_id AND status = 'pending')
   WITH CHECK (auth.uid() = user_id AND status = 'pending');

   -- Bloquer DELETE
   CREATE POLICY "Users cannot delete transactions"
   ON public.transactions
   FOR DELETE
   TO authenticated
   USING (false);
   ```

3. **Cliquer sur "RUN"** (en bas à droite)

4. **Vérifier** :
   ```sql
   SELECT policyname, cmd
   FROM pg_policies
   WHERE tablename = 'transactions';
   ```

### Option 2 : Via fichier local

Le fichier SQL complet est disponible ici :

```
/Users/mac/Desktop/ONE SMS V1/FIX_TRANSACTIONS_POLICIES.sql
```

Copiez tout le contenu et collez-le dans le SQL Editor.

## 📋 Résultat attendu

Après l'exécution, vous devriez voir ces policies :

| Policy Name                                 | Command | Description                               |
| ------------------------------------------- | ------- | ----------------------------------------- |
| `Users can create own transactions`         | INSERT  | ✅ Permet de créer ses transactions       |
| `Users can update own pending transactions` | UPDATE  | ✅ Permet de MAJ ses transactions pending |
| `Users cannot delete transactions`          | DELETE  | 🚫 Bloque la suppression                  |
| `Users view own transactions`               | SELECT  | 👁️ Voit ses propres transactions          |
| `Service role transactions full access`     | ALL     | 🔑 Accès complet service role             |

## 🧪 Test

Après avoir appliqué la migration :

1. **Rechargez** la page `http://localhost:3001/topup`
2. **Sélectionnez** un montant (ex: 5000 FCFA)
3. **Choisissez** Wave
4. **Cliquez** "Payer"

✅ **Attendu** : Redirection vers `/wave-proof` avec le formulaire
❌ **Avant** : Erreur 403

## 🔍 Debug

Si l'erreur persiste :

```sql
-- Vérifier RLS activé
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'transactions';
-- Doit retourner: rowsecurity = true

-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'transactions';
```

## 📞 Support

Si problème persistant, vérifier dans la console :

- Message d'erreur exact
- User ID dans les logs
- Vérifier que l'utilisateur est bien `authenticated`
