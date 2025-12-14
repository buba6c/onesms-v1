#!/bin/bash

# Quick check du rental via l'API Supabase
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/rpc/check_rental' \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'

echo ""
echo "Si pas de RPC, utilise le SQL Editor du dashboard Supabase:"
echo ""
cat diagnostic_rental_5fee6b1e.sql
