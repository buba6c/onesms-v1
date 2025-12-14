# 🎨 Générateur automatique d'icônes de services

Script Node.js complet pour importer automatiquement des icônes de haute qualité pour +1300 services (Instagram, WhatsApp, Google, etc.).

## 🎯 Fonctionnalités

- **Sources multiples** : 5 sources d'icônes avec fallback automatique

  1. `simple-icons` - 3000+ logos avec fuzzy matching
  2. Brandfetch API - Logos officiels de marques
  3. Clearbit Logo API - Base de données massive
  4. Google Favicon API - Favicons de sites web
  5. Fallback SVG - Génération automatique (initiales + couleur)

- **Optimisation complète** :

  - SVG optimisés avec SVGO (taille réduite ~40%)
  - PNG vectorisés avec Potrace
  - 5 tailles PNG générées : 32, 64, 128, 256, 512px

- **Upload S3 automatique** :

  - Upload SVG + tous les PNG
  - Headers de cache optimisés (1 an)
  - URLs publiques retournées

- **Performance** :

  - Traitement batch avec `p-limit`
  - Concurrency configurable (défaut: 10)
  - Logging en temps réel (NDJSON)

- **Intégration Supabase** :
  - Récupération automatique de la liste des services
  - Mise à jour de la colonne `icon_url` après upload

## 📦 Installation

```bash
# 1. Installer les dépendances
npm install simple-icons string-similarity node-fetch sharp svgo @thiagoelg/node-potrace p-limit @aws-sdk/client-s3 @supabase/supabase-js

# Ou utiliser le package.json fourni
npm install
```

## ⚙️ Configuration

### 1. Variables d'environnement

Créer un fichier `.env` à la racine du projet :

```bash
# AWS S3 (OBLIGATOIRE)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
S3_BUCKET=onesms-icons
S3_BASE_URL=https://onesms-icons.s3.us-east-1.amazonaws.com

# Supabase (OBLIGATOIRE)
SUPABASE_URL=https://htfqmamvmhdoixqcbbbw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Brandfetch (OPTIONNEL - améliore la qualité)
BRANDFETCH_API_KEY=your_api_key_here
```

### 2. Configuration AWS S3

**Option A - Créer un nouveau bucket** :

```bash
# Avec AWS CLI
aws s3 mb s3://onesms-icons --region us-east-1

# Configurer les permissions publiques
aws s3api put-bucket-policy --bucket onesms-icons --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::onesms-icons/*"
  }]
}'
```

**Option B - Utiliser un bucket existant** :

- S'assurer que le bucket autorise les uploads publics
- Configurer les variables `S3_BUCKET` et `S3_BASE_URL`

### 3. Obtenir la clé Supabase Service Role

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet `htfqmamvmhdoixqcbbbw`
3. Settings → API → Service Role Key (secret)
4. Copier dans `.env`

### 4. (Optionnel) Clé API Brandfetch

Pour améliorer la qualité des icônes :

1. Créer un compte sur https://brandfetch.com
2. Aller dans Dashboard → API Keys
3. Créer une nouvelle clé
4. Ajouter dans `.env`

## 🚀 Utilisation

### Exécution complète

```bash
node import-icons.js
```

Le script va :

1. ✅ Récupérer tous les services depuis Supabase
2. 🔍 Chercher la meilleure icône pour chaque service
3. 🎨 Générer SVG optimisé + 5 PNG
4. ☁️ Uploader sur S3
5. 💾 Mettre à jour la base de données
6. 📊 Afficher les statistiques finales

### Test sur un petit échantillon

Pour tester avant de lancer l'import complet, modifier temporairement le script ligne ~550 :

```javascript
// Limiter à 10 services pour test
const { data: services, error } = await supabase
  .from("services")
  .select("id, code, name, display_name")
  .order("popularity_score", { ascending: false })
  .limit(10); // ← Ajouter cette ligne
```

## 📁 Structure de sortie

```
out-icons/
├── instagram/
│   ├── icon.svg
│   ├── icon-32.png
│   ├── icon-64.png
│   ├── icon-128.png
│   ├── icon-256.png
│   └── icon-512.png
├── whatsapp/
│   └── ...
└── google/
    └── ...

import-results.ndjson   # Résultats ligne par ligne (temps réel)
import-results.json     # Résultats complets (JSON array)
```

### Structure S3

```
s3://onesms-icons/
└── icons/
    ├── instagram/
    │   ├── icon.svg
    │   ├── icon-32.png
    │   ├── icon-64.png
    │   ├── icon-128.png
    │   ├── icon-256.png
    │   └── icon-512.png
    ├── whatsapp/
    │   └── ...
    └── google/
        └── ...
```

## 📊 Format des résultats

### import-results.json

```json
[
  {
    "id": "uuid-here",
    "code": "instagram",
    "name": "Instagram",
    "success": true,
    "source": "simple-icons",
    "svg_url": "https://onesms-icons.s3.amazonaws.com/icons/instagram/icon.svg",
    "png_urls": {
      "32": "https://onesms-icons.s3.amazonaws.com/icons/instagram/icon-32.png",
      "64": "https://onesms-icons.s3.amazonaws.com/icons/instagram/icon-64.png",
      "128": "https://onesms-icons.s3.amazonaws.com/icons/instagram/icon-128.png",
      "256": "https://onesms-icons.s3.amazonaws.com/icons/instagram/icon-256.png",
      "512": "https://onesms-icons.s3.amazonaws.com/icons/instagram/icon-512.png"
    },
    "error": null,
    "timestamp": "2025-11-22T10:30:45.123Z"
  },
  {
    "id": "uuid-here",
    "code": "unknown-service",
    "name": "Unknown Service",
    "success": false,
    "source": null,
    "svg_url": null,
    "png_urls": {},
    "error": "Failed to obtain SVG from all sources",
    "timestamp": "2025-11-22T10:30:47.456Z"
  }
]
```

## 🔧 Dépannage

### Erreur: "Missing AWS credentials"

→ Vérifier que les variables `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, et `S3_BUCKET` sont définies dans `.env`

### Erreur: "S3 upload failed: AccessDenied"

→ Vérifier les permissions IAM de l'utilisateur AWS :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:PutObjectAcl", "s3:GetObject"],
      "Resource": "arn:aws:s3:::onesms-icons/*"
    }
  ]
}
```

### Erreur: "Database update failed"

→ Vérifier que la clé `SUPABASE_SERVICE_ROLE_KEY` (pas la clé anon) est utilisée

### Performances lentes

→ Augmenter la concurrence dans le script (ligne 26) :

```javascript
const CONCURRENCY_LIMIT = 20; // Au lieu de 10
```

### Icônes de mauvaise qualité

→ Ajouter une clé API Brandfetch pour améliorer les résultats

## 📈 Statistiques typiques

Pour ~1300 services :

- ⏱️ **Durée** : 10-15 minutes (avec concurrence 10)
- 🎯 **Taux de succès** : 85-95%
- 📦 **Sources** :
  - simple-icons : ~60%
  - Brandfetch : ~15%
  - Clearbit : ~10%
  - Google Favicon : ~5%
  - Fallback : ~10%
- 💾 **Taille totale S3** : ~150 MB (SVG + PNG)

## 🔄 Mise à jour du schéma Supabase

Si la colonne `icon_url` n'existe pas encore dans la table `services` :

```sql
-- Ajouter la colonne icon_url
ALTER TABLE services ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_services_icon_url ON services(icon_url);
```

## 📝 Notes importantes

1. **Coûts AWS** : S3 standard coûte ~$0.023/GB/mois. Pour 150 MB d'icônes = ~$0.003/mois
2. **Brandfetch** : Plan gratuit limité à 100 requêtes/mois. Plan payant recommandé pour 1300+ services
3. **Mise en cache** : Les fichiers ont un cache de 1 an → réduire les requêtes futures
4. **Re-exécution** : Le script écrase les fichiers existants (safe pour re-run)

## 🎨 Personnalisation

### Modifier les tailles PNG

Ligne 25 du script :

```javascript
const PNG_SIZES = [32, 64, 128, 256, 512]; // Ajouter/supprimer des tailles
```

### Changer la couleur du fallback

Ligne 169 du script (fonction `hashColor`) :

```javascript
const sat = 70; // Saturation (0-100)
const light = 50; // Luminosité (0-100)
```

### Modifier la priorité des sources

Ligne 435 du script (fonction `processService`) :

```javascript
let iconData =
  await tryBrandfetch(displayName, code) ||    // Brandfetch en premier
  await trySimpleIcons(displayName, code) ||   // Simple-icons en second
  // ...
```

## 📞 Support

En cas de problème :

1. Vérifier les logs dans la console
2. Consulter `import-results.ndjson` pour les erreurs
3. Vérifier les permissions AWS/Supabase
4. Tester avec un petit échantillon d'abord

---

**Créé pour ONE SMS V1** | [Documentation complète](https://github.com/your-repo)
