# 🚀 Guide de démarrage rapide - Générateur d'icônes

## Installation en 3 minutes

### Étape 1 : Configuration (2 min)

```bash
# Exécuter le script de configuration interactif
./setup-icons.sh
```

Le script vous demandera :
- ✅ AWS Access Key ID
- ✅ AWS Secret Access Key  
- ✅ S3 Bucket Name
- ✅ Supabase Service Role Key
- ⚪ Brandfetch API Key (optionnel)

### Étape 2 : Test (1 min)

```bash
# Option A - Test manuel avec 5 services
node test-icons.js

# Option B - Test avec 10 vrais services
# Modifier import-icons.js ligne 550: ajouter .limit(10)
node import-icons.js
```

### Étape 3 : Import complet

```bash
# Lancer l'import des ~1300 services
node import-icons.js
```

---

## Checklist avant de commencer

- [ ] Compte AWS avec accès S3
- [ ] Bucket S3 créé avec permissions publiques
- [ ] Service Role Key Supabase (pas la clé anon!)
- [ ] Node.js 18+ installé
- [ ] ~15 minutes de temps libre

---

## Commandes utiles

```bash
# Vérifier la configuration
cat .env.icons

# Installer les dépendances manuellement
npm install simple-icons string-similarity node-fetch sharp svgo @thiagoelg/node-potrace p-limit @aws-sdk/client-s3 @supabase/supabase-js

# Appliquer la migration Supabase
npx supabase db push

# Consulter les résultats
cat import-results.json | jq '.[] | select(.success == false)'  # Erreurs uniquement
cat import-results.json | jq 'group_by(.source) | map({source: .[0].source, count: length})'  # Stats par source
```

---

## Résolution rapide de problèmes

### ❌ "Missing AWS credentials"
→ Vérifier `.env.icons` : les 3 variables AWS sont remplies

### ❌ "S3 upload failed: AccessDenied"
→ Vérifier les permissions IAM (PutObject, PutObjectAcl)

### ❌ "Database update failed"
→ Utiliser la **Service Role Key** (pas anon key)

### ⚠️ Icônes de mauvaise qualité
→ Ajouter une clé Brandfetch API

### 🐌 Trop lent
→ Augmenter `CONCURRENCY_LIMIT` dans import-icons.js (ligne 26)

---

## Coûts estimés

| Service | Coût |
|---------|------|
| AWS S3 Storage (150 MB) | ~$0.003/mois |
| AWS S3 PUT Requests (7800) | ~$0.04 |
| Brandfetch API (1300 calls) | $29/mois (plan Pro) ou gratuit (100/mois) |
| **TOTAL** | ~$0.04 + $29 (optionnel) |

---

## Résultat attendu

```
✅ Succès:           1247/1300
❌ Échecs:           53
⏱️  Durée totale:     12m 34s
⚡ Vitesse moyenne:  1.73 services/s

📦 Sources utilisées:
   simple-icons         780
   brandfetch          195
   clearbit            130
   google-favicon      65
   fallback            77
```

---

## Support

📖 **Documentation complète** : `README-ICONS.md`

🐛 **En cas de problème** :
1. Vérifier les logs console
2. Consulter `import-results.ndjson`
3. Tester avec 1 service : `.limit(1)` dans le code

---

**Temps total estimé** : 15-20 minutes pour 1300 services ⚡
