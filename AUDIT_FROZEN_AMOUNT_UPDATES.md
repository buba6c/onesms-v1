# AUDIT: Fonctions Edge qui font UPDATE direct de frozen_amount

## ❌ DANGEREUX (à corriger) :

### 1. sync-sms-activate-activations/index.ts

- Ligne 153: `.update({ frozen_amount: 0 })`
- Ligne 173: `.update({ frozen_amount: 0 })`
- **Action**: Remplacer par appel à atomic_commit()

### 2. cron-check-pending-sms/index.ts

- Ligne 172: `.update({ frozen_amount: 0 })`
- Ligne 188: `.update({ frozen_amount: 0 })`
- **Action**: Remplacer par appel à atomic_commit()

### 3. recover-sms-from-history/index.ts

- Ligne 209: `.update({ frozen_amount: 0 })`
- Ligne 229: `.update({ frozen_amount: 0 })`
- **Action**: Remplacer par appel à atomic_commit()

### 4. cancel-sms-activate-order/index.ts

- Ligne 153: `.update({ frozen_amount: 0 })`
- **Action**: Remplacer par appel à atomic_refund()

## ✅ DÉJÀ CORRECT :

### check-sms-activate-status/index.ts

- Utilise déjà atomic_commit() ✅
- Utilise déjà atomic_refund() pour timeouts ✅

### cleanup-expired-activations/index.ts

- Utilise déjà atomic_refund() ✅

## PLAN DE CORRECTION :

1. Installer PROTECT_FROZEN_AMOUNT.sql (triggers de protection)
2. Corriger les 4 fonctions problématiques
3. Redéployer les Edge Functions
4. Les tentatives de UPDATE direct échoueront avec erreur explicite
5. Le système sera 100% robuste
