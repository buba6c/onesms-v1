#!/bin/bash
# Déploiement de cron-check-pending-sms avec fix atomic_refund

echo "🚀 Déploiement de cron-check-pending-sms (FIX atomic_refund)..."
echo ""

npx supabase functions deploy cron-check-pending-sms

echo ""
echo "✅ Fonction déployée avec succès!"
echo ""
echo "📝 Changements:"
echo "  - Timeout: Utilise atomic_refund au lieu de code manuel"
echo "  - Cancelled: Utilise atomic_refund au lieu de code manuel"
echo ""
echo "🎯 Next steps:"
echo "  1. Lancer le cleanup: node cleanup_frozen_phantom_funds.mjs"
echo "  2. Vérifier frozen_balance = 5Ⓐ après cleanup"
echo "  3. Tester un timeout pour confirmer le fix"
