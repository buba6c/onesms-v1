#!/bin/bash

# Monitoring buba6c - 6 minutes (36 cycles)
export DATABASE_URL='postgresql://postgres.htfqmamvmhdoixqcbbbw:Workeverytime%404%23%23@aws-1-eu-central-2.pooler.supabase.com:5432/postgres'

echo "🔍 MONITORING ACTIVATIONS - buba6c@gmail.com"
echo "Durée: 6 minutes"
echo "Début: $(date '+%H:%M:%S')"
echo ""

for i in {1..36}; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Cycle $i/36 - $(date '+%H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # État user
  psql "$DATABASE_URL" -t -A -F'|' -c "SELECT email, balance, frozen_balance FROM users WHERE id = 'e108c02a-2012-4043-bbc2-fb09bb11f824';" | while IFS='|' read email balance frozen; do
    echo "👤 User: $email | Balance: ${balance}Ⓐ | Frozen: ${frozen}Ⓐ"
  done
  
  # Activations en cours
  count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM activations WHERE user_id = 'e108c02a-2012-4043-bbc2-fb09bb11f824' AND status IN ('pending', 'active');")
  frozen_total=$(psql "$DATABASE_URL" -t -c "SELECT COALESCE(SUM(frozen_amount), 0) FROM activations WHERE user_id = 'e108c02a-2012-4043-bbc2-fb09bb11f824' AND status IN ('pending', 'active');")
  echo "📱 Activations: $count en cours | Frozen total: ${frozen_total}Ⓐ"
  
  # Cohérence
  user_frozen=$(psql "$DATABASE_URL" -t -c "SELECT frozen_balance FROM users WHERE id = 'e108c02a-2012-4043-bbc2-fb09bb11f824';")
  if [ "$user_frozen" = "$frozen_total" ]; then
    echo "✅ Cohérence OK"
  else
    echo "⚠️  ÉCART: user_frozen=$user_frozen vs calc=$frozen_total"
  fi
  
  echo ""
  sleep 10
done

echo "✅ Monitoring terminé à $(date '+%H:%M:%S')"
