# 🏦 Architecture Financière ONE SMS - Version 2.0

## Problème Résolu

### Avant (Bug critique)

```
RENT (SANS PROTECTION ❌):
1. Vérifier balance (sans frozen)
2. Appel API SMS-Activate (AUCUNE PROTECTION!)
3. Si OK → balance -= price (débit direct)
→ Risque: double-click, erreurs partielles, pas de traçabilité
```

### Après (Architecture FES ✅)

```
RENT (AVEC PROTECTION ✅):
Phase 1 - FREEZE:
  1. Vérifier balance disponible (balance - frozen)
  2. Créer transaction PENDING
  3. frozen_balance += price

Phase 2 - EXECUTE:
  4. Appel API SMS-Activate
  5. Si erreur → UNFREEZE (frozen -= price, tx=failed)

Phase 3 - SETTLE:
  6. Si OK → balance -= price, frozen -= price, tx=completed
```

## Fichiers Modifiés

### 1. `supabase/functions/_shared/financial-operations.ts` (NOUVEAU)

Module partagé avec 4 fonctions atomiques:

- `freezeCredits()` - Geler avant achat
- `unfreezeCredits()` - Dégeler si échec
- `settleTransaction()` - Finaliser avec débit
- `refundTransaction()` - Annuler sans débit

### 2. `supabase/functions/buy-sms-activate-rent/index.ts` (MODIFIÉ)

- ✅ Import du module `financial-operations`
- ✅ Phase 1: `freezeCredits()` avant l'appel API
- ✅ Phase 2: Appel API avec rollback si erreur
- ✅ Phase 3: `settleTransaction()` après succès
- ✅ Transaction liée au rental créé

## Avantages

| Aspect       | Avant              | Après                   |
| ------------ | ------------------ | ----------------------- |
| Double-click | ❌ Possible        | ✅ Protégé par frozen   |
| Erreur API   | ❌ Pas de rollback | ✅ Rollback automatique |
| Traçabilité  | ❌ Tx après débit  | ✅ Tx avant tout        |
| Cohérence    | ❌ Balance seule   | ✅ Balance + Frozen     |
| Code         | ❌ Dupliqué        | ✅ Module partagé       |

## Flux Visuel

```
┌─────────────────────────────────────────────────────────────────┐
│ 👤 Utilisateur clique "Acheter Rent"                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 🔒 PHASE 1: FREEZE                                              │
│                                                                 │
│   balance: 500Ⓐ  →  balance: 500Ⓐ                              │
│   frozen:   0Ⓐ  →  frozen:  100Ⓐ                               │
│   available: 500Ⓐ → available: 400Ⓐ                            │
│                                                                 │
│   + Transaction PENDING créée (id: xxx)                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 🌐 PHASE 2: EXECUTE (Appel API SMS-Activate)                    │
└───────────┬─────────────────────────────────────┬───────────────┘
            │                                     │
     ✅ Succès                              ❌ Erreur
            │                                     │
            ▼                                     ▼
┌───────────────────────────┐       ┌─────────────────────────────┐
│ 📝 Créer rental           │       │ 🔙 ROLLBACK                 │
│ rental_id: yyy            │       │                             │
│ transaction_id: xxx       │       │   frozen: 100Ⓐ → 0Ⓐ        │
└───────────┬───────────────┘       │   Transaction → FAILED      │
            │                       │                             │
            ▼                       │   → Erreur retournée        │
┌───────────────────────────┐       └─────────────────────────────┘
│ 💰 PHASE 3: SETTLE        │
│                           │
│   balance: 500Ⓐ → 400Ⓐ   │
│   frozen:  100Ⓐ → 0Ⓐ     │
│   Transaction → COMPLETED │
│                           │
│   → Succès retourné       │
└───────────────────────────┘
```

## Déploiement

```bash
# Déjà fait ✅
npx supabase functions deploy buy-sms-activate-rent --no-verify-jwt
```

## Script de Nettoyage

Pour corriger les problèmes existants (108 identifiés par l'audit):

```bash
node financial_cleanup.mjs
```

⚠️ Le script est en mode DRY_RUN par défaut. Modifier `DRY_RUN = false` pour exécuter les corrections.

## Prochaines Étapes (Optionnelles)

1. **Refactorer `buy-sms-activate-number`** pour utiliser le même module
2. **Ajouter un CRON** pour nettoyer les pending > 1h automatiquement
3. **Créer un dashboard admin** pour visualiser les frozen_balance

---

_Implémenté le: $(date)_
_Architecture: Freeze-Execute-Settle (FES)_
