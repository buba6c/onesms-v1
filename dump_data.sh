#!/bin/bash
cd '/Users/mac/Desktop/ONE SMS V1'

echo "📦 Dump des données de Supabase Cloud..."
supabase db dump -f dump_data.sql -s public --linked -p 'Bouba@2307##' --data-only

if [ -f dump_data.sql ]; then
  echo "✅ Data dump terminé!"
  ls -lh dump_data.sql
  echo ""
  echo "📊 Lignes:"
  wc -l dump_data.sql
else
  echo "❌ Échec"
fi
