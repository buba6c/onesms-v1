# 🎨 Générateur automatique d'icônes - Guide d'utilisation

## 🚀 Démarrage rapide (3 étapes)

```bash
# 1. Configuration (2 minutes)
./setup-icons.sh

# 2. Test (30 secondes)
node test-icons.js

# 3. Import complet (10-15 minutes)
node import-icons.js
```

## 📚 Documentation

- **[QUICKSTART-ICONS.md](QUICKSTART-ICONS.md)** - Guide rapide (lecture 2 min)
- **[README-ICONS.md](README-ICONS.md)** - Documentation complète (lecture 10 min)
- **[FILES-CREATED.md](FILES-CREATED.md)** - Liste de tous les fichiers créés

## ⚡ Aperçu rapide

Exécutez `./start-icons.sh` pour voir le guide interactif complet.

## 🎯 Que fait ce script ?

1. **Récupère** automatiquement la liste de vos 1300+ services depuis Supabase
2. **Cherche** la meilleure icône pour chaque service (5 sources différentes)
3. **Génère** un SVG optimisé + 5 PNG (32, 64, 128, 256, 512 px)
4. **Upload** tous les fichiers sur votre bucket S3
5. **Met à jour** la base de données avec les URLs

## 📦 Résultat

```
✅ ~1300 services traités en 10-15 minutes
✅ ~7800 fichiers générés (SVG + PNG)
✅ ~150 MB sur S3
✅ Taux de succès: 85-95%
✅ Coût: ~$0.05/mois
```

## 🔧 Prérequis

- ✅ Node.js 18+
- ✅ Compte AWS avec accès S3
- ✅ Bucket S3 créé (ou utiliser `s3-bucket.tf`)
- ✅ Service Role Key Supabase

## 📞 Besoin d'aide ?

1. Consultez [QUICKSTART-ICONS.md](QUICKSTART-ICONS.md)
2. Lisez [README-ICONS.md](README-ICONS.md)
3. Exécutez `./start-icons.sh` pour le guide interactif

---

**Créé pour ONE SMS V1** | Novembre 2025
