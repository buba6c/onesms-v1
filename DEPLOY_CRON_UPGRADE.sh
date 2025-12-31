#!/bin/bash
echo "🚀 Deploying Upgraded Cron..."
npx supabase functions deploy cron-atomic-reliable
echo "✅ Deployment requested."
