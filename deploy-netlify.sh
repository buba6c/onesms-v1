#!/bin/bash

# Script pour configurer automatiquement les variables d'environnement sur Netlify

echo "🔧 Configuration des variables d'environnement Netlify..."

# Variables d'environnement
npx netlify env:set VITE_SUPABASE_URL "https://onesms-sn.com" --force
npx netlify env:set VITE_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZnFtYW12bWhkb2l4cWNiYmJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2MjQ4MjgsImV4cCI6MjA3OTIwMDgyOH0.HQ5KsI86nrDidy4XLh1OnOSpM8c1ZnY3fYo-UF5Jtyg" --force
npx netlify env:set VITE_SMS_ACTIVATE_API_KEY "d29edd5e1d04c3127d5253d5eAe70de8" --force
npx netlify env:set VITE_SMS_ACTIVATE_API_URL "https://api.sms-activate.io/stubs/handler_api.php" --force
npx netlify env:set VITE_PAYTECH_API_KEY "4dea587b182901ca89105554b9bc763c15fd768dd445f537f786d5ef80a2d481" --force
npx netlify env:set VITE_PAYTECH_API_SECRET "ac846eb315057c6ae8b4453a25ac6a890832e277feb3fdce4e3081848f58a672" --force
npx netlify env:set VITE_PAYTECH_API_URL "https://paytech.sn/api" --force
npx netlify env:set VITE_PAYTECH_ENV "test" --force
npx netlify env:set VITE_PAYTECH_IPN_URL "https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/paytech-ipn" --force
npx netlify env:set VITE_PAYTECH_SUCCESS_URL "https://onesms-v1.netlify.app/transactions?status=success" --force
npx netlify env:set VITE_PAYTECH_CANCEL_URL "https://onesms-v1.netlify.app/transactions?status=cancelled" --force
npx netlify env:set VITE_APP_NAME "One SMS" --force
npx netlify env:set VITE_APP_URL "https://onesms-v1.netlify.app" --force
npx netlify env:set VITE_APP_VERSION "1.0.0" --force
npx netlify env:set NODE_VERSION "20" --force

echo "✅ Variables d'environnement configurées!"
echo "🚀 Redéploiement en cours..."

# Redéploiement
npx netlify deploy --prod --build

echo "🎉 Déploiement terminé! Visite https://onesms-v1.netlify.app"
