# 🎯 Commandes essentielles - Générateur d'icônes

## Installation et configuration

```bash
# 1. Configuration interactive
./setup-icons.sh

# 2. Installation manuelle des dépendances
npm install simple-icons string-similarity node-fetch sharp svgo @thiagoelg/node-potrace p-limit @aws-sdk/client-s3 @supabase/supabase-js

# 3. Appliquer la migration Supabase
npx supabase db push
# Ou manuellement dans SQL Editor:
# https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql
```

## Vérification

```bash
# Vérifier que tout est prêt
node health-check-icons.js

# Afficher le guide interactif
./start-icons.sh

# Vérifier la configuration
cat .env.icons
```

## Exécution

```bash
# Test rapide (5 services)
node test-icons.js

# Import complet (~1300 services)
node import-icons.js

# Import avec limite (pour test)
# Modifier import-icons.js ligne 550: ajouter .limit(10)
node import-icons.js
```

## Résultats

```bash
# Voir les résultats en temps réel
tail -f import-results.ndjson

# Voir les statistiques finales
cat import-results.json | jq '.'

# Compter les succès/échecs
cat import-results.json | jq 'map(select(.success == true)) | length'  # Succès
cat import-results.json | jq 'map(select(.success == false)) | length' # Échecs

# Voir les erreurs uniquement
cat import-results.json | jq '.[] | select(.success == false) | {code, name, error}'

# Statistiques par source
cat import-results.json | jq 'group_by(.source) | map({source: .[0].source, count: length})'
```

## AWS S3

```bash
# Lister les icônes uploadées
aws s3 ls s3://onesms-icons/icons/ --recursive

# Compter les fichiers
aws s3 ls s3://onesms-icons/icons/ --recursive | wc -l

# Calculer la taille totale
aws s3 ls s3://onesms-icons/icons/ --recursive --summarize

# Tester une URL
curl -I https://onesms-icons.s3.amazonaws.com/icons/instagram/icon.svg

# Supprimer tous les fichiers (ATTENTION!)
# aws s3 rm s3://onesms-icons/icons/ --recursive
```

## Terraform (optionnel)

```bash
# Initialiser Terraform
terraform init

# Voir les changements
terraform plan

# Créer l'infrastructure S3
terraform apply

# Voir les outputs
terraform output

# Détruire l'infrastructure (ATTENTION!)
# terraform destroy
```

## Supabase

```bash
# Requête SQL pour voir les services avec icônes
# Dans SQL Editor: https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql

# Compter les services avec icônes
SELECT COUNT(*) FROM services WHERE icon_url IS NOT NULL;

# Voir les services sans icônes
SELECT code, name FROM services WHERE icon_url IS NULL ORDER BY popularity_score DESC;

# Mettre à jour une icône manuellement
UPDATE services 
SET icon_url = 'https://onesms-icons.s3.amazonaws.com/icons/custom/icon.svg'
WHERE code = 'mon-service';
```

## Dépannage

```bash
# Vérifier les versions
node --version  # Doit être >= 18
npm --version

# Vérifier les dépendances installées
npm list simple-icons string-similarity sharp svgo

# Réinstaller une dépendance problématique
npm uninstall sharp
npm install sharp

# Vérifier les credentials AWS
aws sts get-caller-identity

# Tester l'accès S3
aws s3 ls s3://onesms-icons/

# Vérifier la connexion Supabase
curl https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/services?limit=1 \
  -H "apikey: YOUR_ANON_KEY"
```

## Nettoyage

```bash
# Supprimer les fichiers générés
rm -rf out-icons/
rm import-results.json
rm import-results.ndjson
rm services-test.json

# Supprimer la configuration (ATTENTION!)
# rm .env.icons
```

## Documentation

```bash
# Lire la doc complète
cat README-ICONS.md | less

# Chercher dans la doc
grep -i "brandfetch" README-ICONS.md

# Voir les fichiers créés
ls -lh *.md *.js *.sh *.tf
```

## Maintenance

```bash
# Re-générer les icônes échouées uniquement
# 1. Extraire les codes des services échoués
cat import-results.json | jq -r '.[] | select(.success == false) | .code' > failed-services.txt

# 2. Modifier import-icons.js pour ne traiter que ces services
# 3. Re-exécuter
node import-icons.js

# Mettre à jour une seule icône
# 1. Télécharger l'icône manuellement
# 2. Upload sur S3:
aws s3 cp mon-icone.svg s3://onesms-icons/icons/mon-service/icon.svg \
  --content-type image/svg+xml \
  --cache-control "public, max-age=31536000, immutable" \
  --acl public-read

# 3. Mettre à jour Supabase (voir section Supabase ci-dessus)
```

## Monitoring

```bash
# Suivre l'exécution en temps réel
node import-icons.js 2>&1 | tee import.log

# Compter les services traités
grep -c "✅ SUCCESS" import.log

# Voir les erreurs
grep "❌ ERROR" import.log

# Temps d'exécution
time node import-icons.js
```

## CloudFront (optionnel)

```bash
# Créer l'invalidation après update
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/icons/*"

# Vérifier le status de l'invalidation
aws cloudfront get-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --id INVALIDATION_ID
```

## Raccourcis utiles

```bash
# Alias dans .zshrc ou .bashrc
alias icons-setup='cd "/Users/mac/Desktop/ONE SMS V1" && ./setup-icons.sh'
alias icons-test='cd "/Users/mac/Desktop/ONE SMS V1" && node test-icons.js'
alias icons-import='cd "/Users/mac/Desktop/ONE SMS V1" && node import-icons.js'
alias icons-check='cd "/Users/mac/Desktop/ONE SMS V1" && node health-check-icons.js'
alias icons-results='cd "/Users/mac/Desktop/ONE SMS V1" && cat import-results.json | jq "."'
```

---

**💡 Tip**: Ajoutez ces alias à votre `.zshrc` pour un accès rapide aux commandes !
