# SMS-Activate Migration Guide

## Overview
This migration adds support for SMS-Activate.io provider, including true number rental functionality that 5sim doesn't offer.

## What's New?
1. **Provider column** added to activations, services, countries, pricing_rules
2. **New rentals table** for tracking rented numbers with SMS inbox
3. **7 new Edge Functions** for SMS-Activate integration
4. **Service & country code mappings** for seamless API translation

## Prerequisites
- SMS-Activate API key from https://sms-activate.io/
- Supabase CLI installed
- Admin access to Supabase project

## Step 1: Database Migration

Run the SQL migration:
```bash
cd "/Users/mac/Desktop/ONE SMS V1"

# Apply migration
supabase db push
```

Or manually execute in Supabase SQL Editor:
```sql
-- Copy contents of supabase/migrations/add_sms_activate_support.sql
```

## Step 2: Environment Variables

### Local Development (.env)
```bash
# Add to .env file
VITE_SMS_ACTIVATE_API_KEY=your_api_key_here
VITE_SMS_ACTIVATE_API_URL=https://api.sms-activate.ae/stubs/handler_api.php
```

### Supabase Secrets
```bash
# Set Edge Function secret
supabase secrets set SMS_ACTIVATE_API_KEY=your_api_key_here
```

## Step 3: Deploy Edge Functions

Deploy all 7 new Edge Functions:
```bash
# Activation functions
supabase functions deploy buy-sms-activate-number
supabase functions deploy check-sms-activate-status
supabase functions deploy cancel-sms-activate-order
supabase functions deploy sync-sms-activate

# Rental functions (NEW!)
supabase functions deploy rent-sms-activate-number
supabase functions deploy get-sms-activate-inbox
supabase functions deploy continue-sms-activate-rent
```

## Step 4: Initial Data Sync

Run the sync function to populate services, countries, and pricing:
```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/sync-sms-activate' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

Or trigger from Supabase dashboard.

## Step 5: Frontend Updates

### Update DashboardPage.tsx
Replace 5sim function calls with SMS-Activate:
```typescript
// OLD
const { data } = await supabase.functions.invoke('buy-5sim-number', {...})

// NEW
const { data } = await supabase.functions.invoke('buy-sms-activate-number', {...})
```

### Update API imports
```typescript
// OLD
import api5sim from '@/lib/api/5sim'

// NEW
import smsActivate from '@/lib/api/sms-activate'
```

## Step 6: Testing

### Test Activation Flow
1. Buy a number (should use SMS-Activate)
2. Wait for SMS
3. Verify SMS received
4. Check transaction completed

### Test Rental Flow (NEW!)
1. Navigate to Rent page
2. Select service + country + duration
3. Rent number
4. Check inbox for received SMS
5. Extend rental
6. Verify extension charged correctly

## API Differences

### 5sim vs SMS-Activate

| Feature | 5sim | SMS-Activate |
|---------|------|--------------|
| URL | `5sim.net/v1` | `api.sms-activate.ae/stubs/handler_api.php` |
| Auth | Bearer token | api_key param |
| Service Codes | Full names | Short codes |
| Country Codes | Names | Numeric IDs |
| Rental | ❌ Not supported | ✅ Full support |

### Service Code Mapping
```
google → go
whatsapp → wa
telegram → tg
instagram → ig
discord → ds
```

### Country Code Mapping
```
russia → 0
usa → 187
england → 12
canada → 36
india → 22
```

## Price Comparison

| Service | 5sim | SMS-Activate | Winner |
|---------|------|--------------|--------|
| WhatsApp | $0.02-0.06 | $4.46 | 5sim (220x cheaper) |
| Telegram | $0.01-0.03 | $2.65 | 5sim (88x cheaper) |
| Instagram | $0.08-0.15 | $0.03 | SMS-Activate |
| Discord | $0.04-0.08 | $0.01 | SMS-Activate |
| **Rental** | ❌ None | $0.50-12/day | Only option |

## Rollback Plan

If migration fails:
```sql
-- Remove provider columns
ALTER TABLE activations DROP COLUMN provider;
ALTER TABLE services DROP COLUMN provider;
ALTER TABLE countries DROP COLUMN provider;
ALTER TABLE pricing_rules DROP COLUMN provider;

-- Drop rentals table
DROP TABLE IF EXISTS rentals CASCADE;

-- Drop new transaction constraints
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
```

Delete new Edge Functions:
```bash
supabase functions delete buy-sms-activate-number
supabase functions delete check-sms-activate-status
supabase functions delete cancel-sms-activate-order
supabase functions delete sync-sms-activate
supabase functions delete rent-sms-activate-number
supabase functions delete get-sms-activate-inbox
supabase functions delete continue-sms-activate-rent
```

## Troubleshooting

### "BAD_KEY" error
- Check SMS_ACTIVATE_API_KEY is set correctly
- Verify API key is valid on SMS-Activate dashboard

### "BAD_ACTION" error
- Verify service code mapping is correct
- Check country code is valid numeric ID

### No countries/services showing
- Run sync-sms-activate function
- Check Supabase logs for errors
- Verify API key has correct permissions

### Rental not working
- Verify rentals table exists
- Check user balance is sufficient
- Ensure rent_hours is valid (4, 24, 168, 720)

## Support
For issues, check:
- Supabase Edge Function logs
- SMS-Activate API status: https://sms-activate.io/
- Migration conversation history

## Next Steps
1. ✅ Test activation flow
2. ✅ Test rental flow
3. ✅ Update pricing display
4. ✅ Monitor error rates
5. ✅ Optimize for best prices (hybrid 5sim + SMS-Activate if needed)
