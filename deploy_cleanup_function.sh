#!/bin/bash
# Deploy the cleanup function
echo "🚀 Deploying cleanup-pending-activations..."
supabase functions deploy cleanup-pending-activations --no-verify-jwt

# Verify secrets (Optional - ensures keys are present)
echo "🔑 Remember to ensure these secrets are set in your Supabase project:"
echo "   - SMSPVA_API_KEY"
echo "   - ONLINESIM_API_KEY"
echo "   - 5SIM_API_TOKEN"
echo "   - SMS_ACTIVATE_API_KEY"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_SERVICE_ROLE_KEY"

echo "✅ Deployment command sent!"
