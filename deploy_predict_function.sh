#!/bin/bash

# Deploy predict-best-provider function
echo "🚀 Deploying predict-best-provider function..."
npx supabase functions deploy predict-best-provider --no-verify-jwt

echo "✅ Deployment complete!"
