#!/bin/bash

# ============================================================================
# 🎨 GÉNÉRATEUR AUTOMATIQUE D'ICÔNES - ONE SMS V1
# ============================================================================
#
# Ce script affiche un guide interactif pour utiliser le générateur d'icônes
#
# ============================================================================

clear

cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   🎨  GÉNÉRATEUR AUTOMATIQUE D'ICÔNES DE SERVICES                       ║
║                                                                          ║
║   📦  1300+ services (Instagram, WhatsApp, Google, etc.)                ║
║   ✨  SVG optimisé + PNG (32, 64, 128, 256, 512)                        ║
║   ☁️   Upload automatique sur S3                                         ║
║   🚀  Intégration Supabase complète                                     ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝

EOF

echo ""
echo "📚 FICHIERS DISPONIBLES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  📄 QUICKSTART-ICONS.md      - Guide rapide (2 pages)"
echo "  📖 README-ICONS.md          - Documentation complète (12 pages)"
echo "  📋 FILES-CREATED.md         - Liste de tous les fichiers créés"
echo ""
echo "  🔧 setup-icons.sh           - Configuration interactive"
echo "  🧪 test-icons.js            - Test avant import complet"
echo "  ⚙️  import-icons.js          - Script principal d'import"
echo ""
echo "  🏗️  s3-bucket.tf             - Config Terraform S3 (optionnel)"
echo "  🌐 cloudfront-cdn.tf        - Config CloudFront CDN (optionnel)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Vérifier si la configuration existe
if [ -f ".env.icons" ]; then
    echo "✅ Configuration détectée (.env.icons)"
    echo ""
    
    # Vérifier si les dépendances sont installées
    if [ -d "node_modules/simple-icons" ]; then
        echo "✅ Dépendances installées"
        echo ""
        echo "🚀 PRÊT À UTILISER !"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "  Commandes disponibles:"
        echo ""
        echo "    node test-icons.js       # Test sur 5 services"
        echo "    node import-icons.js     # Import complet (~1300 services)"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
    else
        echo "⚠️  Dépendances manquantes"
        echo ""
        echo "Installer avec:"
        echo "  npm install simple-icons string-similarity node-fetch sharp svgo @thiagoelg/node-potrace p-limit @aws-sdk/client-s3 @supabase/supabase-js"
        echo ""
    fi
else
    echo "❌ Configuration non trouvée"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  🎯 DÉMARRAGE RAPIDE (3 étapes)"
    echo ""
    echo "    1. ./setup-icons.sh          # Configuration interactive (2 min)"
    echo "    2. node test-icons.js        # Test (30 secondes)"
    echo "    3. node import-icons.js      # Import complet (10-15 min)"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  📋 PRÉREQUIS"
    echo ""
    echo "    • Compte AWS avec accès S3"
    echo "    • Bucket S3 créé (ou utiliser s3-bucket.tf)"
    echo "    • Service Role Key Supabase"
    echo "    • Node.js 18+ installé"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

# Afficher les statistiques attendues
cat << "EOF"

📊 RÉSULTATS ATTENDUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Services traités:    ~1300
  Taux de succès:      85-95%
  Durée totale:        10-15 minutes
  Vitesse moyenne:     1.5-2 services/sec
  Fichiers générés:    ~7800 (SVG + PNG)
  Taille totale S3:    ~150 MB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


📦 SOURCES D'ICÔNES (par priorité)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. simple-icons          ~60%    (3000+ logos, fuzzy matching)
  2. Brandfetch API        ~15%    (logos officiels, requiert clé API)
  3. Clearbit Logo API     ~10%    (gratuit, large base de données)
  4. Google Favicon API    ~5%     (gratuit, favicons de sites web)
  5. Fallback SVG          ~10%    (généré: initiales + couleur)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


💰 COÛTS ESTIMÉS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  AWS S3 Storage:      $0.003/mois  (150 MB)
  AWS S3 Requests:     $0.04        (7800 PUT + GET)
  Brandfetch API:      $0 ou $29    (gratuit: 100/mois, Pro: illimité)
  CloudFront CDN:      +$0.30       (optionnel, améliore performances)

  Total minimum:       ~$0.05/mois  (sans Brandfetch Pro ni CDN)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


📞 SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  📖 Documentation:    cat QUICKSTART-ICONS.md
                       cat README-ICONS.md

  🐛 Dépannage:        Consulter les logs console
                       cat import-results.ndjson

  ✉️  Contact:         [Votre email/GitHub]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EOF

echo ""
echo "✨ Prêt à générer vos icônes ? Suivez les étapes ci-dessus !"
echo ""
