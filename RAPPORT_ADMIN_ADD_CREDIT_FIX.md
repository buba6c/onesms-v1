═══════════════════════════════════════════════════════════════════════
  🔍 ANALYSE PROBLÈME: admin_add_credit.sql
═══════════════════════════════════════════════════════════════════════

## ❌ ERREUR DÉTECTÉE

```
new row for relation "transactions" violates check constraint 
"transactions_payment_method_check"
```

## 🎯 CAUSE ROOT

La fonction `admin_add_credit()` essaie d'insérer une transaction avec:
```sql
payment_method = 'admin'
```

Mais la contrainte `transactions_payment_method_check` n'autorise que:
- `'paytech'`
- `'mobile_money'`
- `'card'`
- `'bonus'`

**'admin' n'est PAS dans la liste !**

## 📋 DÉFINITION DE LA CONTRAINTE

Dans `supabase/migrations/001_init_schema.sql` ligne 62:

```sql
payment_method TEXT CHECK (payment_method IN ('paytech', 'mobile_money', 'card', 'bonus'))
```

## 💡 SOLUTIONS PROPOSÉES

### ✅ SOLUTION 1: Utiliser 'bonus' (RECOMMANDÉ)

Changer dans `admin_add_credit.sql`:
```sql
payment_method = 'bonus'  -- au lieu de 'admin'
```

**Avantages:**
- Pas besoin de modifier la DB
- 'bonus' est déjà prévu pour les crédits gratuits
- Fonctionne immédiatement

### ✅ SOLUTION 2: Ajouter 'admin' à la contrainte

Exécuter ce SQL:
```sql
-- Supprimer l'ancienne contrainte
ALTER TABLE transactions DROP CONSTRAINT transactions_payment_method_check;

-- Recréer avec 'admin' ajouté
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
  CHECK (payment_method IN ('paytech', 'mobile_money', 'card', 'bonus', 'admin'));
```

**Avantages:**
- Plus clair sémantiquement
- Permet de distinguer les crédits admin des bonus

**Inconvénients:**
- Nécessite une migration DB
- Affecte potentiellement d'autres parties du code

### ⚠️  SOLUTION 3: Mettre NULL

```sql
payment_method = NULL
```

**Inconvénients:**
- Perte d'information sur l'origine du crédit
- Non recommandé pour l'audit

## 🚀 ACTION RECOMMANDÉE

**Utiliser SOLUTION 1** (bonus) car:
1. ✅ Fonctionne immédiatement
2. ✅ Pas de modification DB nécessaire
3. ✅ Sémantiquement correct (crédit gratuit = bonus)
4. ✅ Déjà utilisé pour les crédits promotionnels

## 📝 MODIFICATION À FAIRE

Dans `admin_add_credit.sql` ligne 52:

```sql
-- AVANT
payment_method,
...
'admin',

-- APRÈS
payment_method,
...
'bonus',
```

═══════════════════════════════════════════════════════════════════════
