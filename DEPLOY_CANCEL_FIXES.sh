#!/bin/bash
echo "🚀 Deploying Cancellation Fixes..."
npx supabase functions deploy cancel-smspva-order
npx supabase functions deploy cancel-5sim-order
npx supabase functions deploy cancel-onlinesim-order
echo "✅ Cancel functions updated."
