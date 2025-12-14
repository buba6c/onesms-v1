# 📊 ONE SMS Platform - Deep Analysis Report

**Date**: $(date +%Y-%m-%d)  
**Status**: Production  
**URL**: https://onesms-sn.com

---

## 📋 Executive Summary

ONE SMS est une plateforme de vérification SMS virtuelle ciblant principalement le marché africain francophone (Sénégal). Elle permet aux utilisateurs d'acheter des numéros virtuels pour recevoir des SMS d'activation de services comme WhatsApp, Telegram, etc.

### 🎯 Business Model

- **Activation SMS**: Achat ponctuel d'un numéro pour recevoir 1 SMS (~20 min validité)
- **Rent (Location)**: Location longue durée (4h à 1 mois) pour recevoir plusieurs SMS
- **Marge**: ~30% sur les prix fournisseur

### 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
│  React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui          │
│  React Query (TanStack) + Zustand + i18n (fr/en)                 │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                        SUPABASE                                   │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐ │
│  │ PostgreSQL DB  │  │ Auth (Google)  │  │ 47 Edge Functions   │ │
│  │ + RLS Policies │  │ + Email        │  │ (Deno TypeScript)   │ │
│  └────────────────┘  └────────────────┘  └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ SMS-Activate    │  │ PayTech         │  │ Logo.dev         │  │
│  │ (Primary SMS)   │  │ (Senegal Pay)   │  │ (Service Icons)  │  │
│  ├─────────────────┤  ├─────────────────┤  └──────────────────┘  │
│  │ 5sim            │  │ Moneroo         │                        │
│  │ (Secondary SMS) │  │ (Pan-African)   │                        │
│  └─────────────────┘  ├─────────────────┤                        │
│                       │ MoneyFusion     │                        │
│                       │ (Wallet)        │                        │
│                       └─────────────────┘                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
ONE SMS V1/
├── src/                        # Frontend React
│   ├── pages/                  # 13 pages + 14 admin pages
│   │   ├── DashboardPage.tsx   # Main activation interface (2005 lines)
│   │   ├── RentPage.tsx        # Rent interface (282 lines)
│   │   ├── CatalogPage.tsx     # Services/countries catalog
│   │   ├── MyNumbersPage.tsx   # User's numbers
│   │   ├── HistoryPage.tsx     # Transaction history
│   │   ├── TopUpPage.tsx       # Payment page (523 lines)
│   │   ├── SettingsPage.tsx    # User settings
│   │   └── admin/              # 14 admin pages
│   ├── components/             # UI components
│   │   ├── ui/                 # shadcn/ui components
│   │   └── layout/             # Layout components
│   ├── hooks/                  # Custom React hooks
│   │   ├── useSmsPolling.ts    # Poll for SMS activation
│   │   ├── useRentPolling.ts   # Poll for rental SMS
│   │   └── useRealtimeSms.ts   # Realtime SMS subscription
│   ├── lib/                    # Utilities & configurations
│   │   ├── supabase.ts         # Supabase client
│   │   ├── logo-service.ts     # Logo.dev API
│   │   └── api/                # API helpers
│   └── stores/                 # Zustand stores
│       └── authStore.ts        # Auth state management
├── supabase/
│   ├── functions/              # 47 Edge Functions (9,767 lines)
│   │   ├── buy-sms-activate-number/
│   │   ├── rent-sms-activate-number/
│   │   ├── check-sms-activate-status/
│   │   ├── sync-sms-activate/
│   │   ├── init-moneroo-payment/
│   │   └── ... (42 more)
│   ├── migrations/             # SQL migrations
│   └── schema.sql              # Main DB schema (456 lines)
└── docs/                       # Documentation
```

---

## 📊 Database Schema

### Core Tables

| Table           | Records | Description                          |
| --------------- | ------- | ------------------------------------ |
| `users`         | 9       | User profiles with balance           |
| `services`      | 1,684   | SMS services (WhatsApp, Telegram...) |
| `countries`     | 337     | Available countries                  |
| `activations`   | 66      | SMS activation orders                |
| `rentals`       | 0       | Long-term rentals                    |
| `transactions`  | -       | Payment/usage records                |
| `pricing_rules` | -       | Service pricing                      |

### Key Tables Schema

```sql
-- USERS (extends auth.users)
users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT ('user' | 'admin'),
  credits DECIMAL(10,2) DEFAULT 0,  -- Balance in USD
  language TEXT DEFAULT 'en',
  is_active BOOLEAN
)

-- ACTIVATIONS (SMS single-use)
activations (
  id UUID PRIMARY KEY,
  user_id UUID,
  order_id TEXT UNIQUE,  -- Provider activation ID
  phone TEXT,
  service_code TEXT,
  country_code TEXT,
  price DECIMAL(10,2),
  status TEXT ('pending' | 'received' | 'timeout' | 'cancelled'),
  sms_code TEXT,
  sms_text TEXT,
  expires_at TIMESTAMP
)

-- RENTALS (Long-term rent)
rentals (
  id UUID PRIMARY KEY,
  user_id UUID,
  rental_id TEXT,  -- Provider rental ID
  phone TEXT,
  service_code TEXT,
  country_code TEXT,
  price DECIMAL(10,2),
  rent_hours INTEGER,
  status TEXT ('active' | 'expired' | 'cancelled'),
  end_date TIMESTAMP
)

-- SERVICES
services (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT,
  provider TEXT ('sms-activate' | '5sim'),
  active BOOLEAN,
  popularity_score INTEGER,
  total_available INTEGER,
  icon_url TEXT
)

-- COUNTRIES
countries (
  id UUID PRIMARY KEY,
  code TEXT,
  name TEXT,
  provider TEXT,
  active BOOLEAN,
  popularity_score INTEGER,
  sms_activate_id INTEGER
)
```

### Row Level Security (RLS)

- ✅ Users can only see their own data
- ✅ Admins can view all data
- ✅ Services/Countries are publicly readable
- ✅ Edge Functions use SERVICE_ROLE_KEY to bypass RLS

---

## ⚙️ Edge Functions (47 total)

### Activation Flow

| Function                    | Purpose                      |
| --------------------------- | ---------------------------- |
| `buy-sms-activate-number`   | Buy number from SMS-Activate |
| `check-sms-activate-status` | Poll for received SMS        |
| `cancel-sms-activate-order` | Cancel and refund            |
| `finish-sms-activate`       | Mark activation complete     |
| `retry-sms-activate`        | Request another SMS          |

### Rent Flow

| Function                     | Purpose                      |
| ---------------------------- | ---------------------------- |
| `rent-sms-activate-number`   | Rent long-term number        |
| `get-rent-services`          | Get rent prices/availability |
| `get-rent-status`            | Check rental status          |
| `continue-sms-activate-rent` | Extend rental duration       |
| `get-sms-activate-inbox`     | Fetch rental messages        |

### Sync Functions

| Function                   | Purpose                         |
| -------------------------- | ------------------------------- |
| `sync-sms-activate`        | Sync services from API          |
| `sync-rent-services`       | Sync RENT services (165 synced) |
| `sync-countries`           | Sync countries                  |
| `update-popularity-scores` | Update service rankings         |
| `sync-service-counts`      | Update availability counts      |

### Payment Functions

| Function                   | Purpose                      |
| -------------------------- | ---------------------------- |
| `init-moneroo-payment`     | Initialize Moneroo payment   |
| `moneroo-webhook`          | Handle Moneroo callbacks     |
| `init-moneyfusion-payment` | Initialize MoneyFusion       |
| `moneyfusion-webhook`      | Handle MoneyFusion callbacks |
| `paytech-ipn`              | PayTech IPN handler          |

---

## 💰 Payment Integration

### PayTech (Primary - Senegal)

```typescript
// Supported methods: Wave, Orange Money, Free Money
// Currency: XOF
// Integration: IPN callback
```

### Moneroo (Pan-African)

```typescript
// Supported methods: MTN, Orange, Wave, Moov
// Countries: Senegal, Ivory Coast, Mali, Burkina, etc.
// Integration: Webhook + Return URL
// API: v1 (https://api.moneroo.io/v1)
```

### MoneyFusion (Wallet)

```typescript
// Supported methods: Orange Money, MTN, Wave, Moov
// Currency: XOF
// Integration: Webhook callback
```

### Payment Flow

```
1. User selects amount & provider
2. Frontend calls Edge Function (init-*-payment)
3. Edge Function creates transaction (status: pending)
4. User redirected to payment provider
5. Provider calls webhook on completion
6. Webhook updates transaction & user balance
```

---

## 📱 SMS Provider Integration

### SMS-Activate (Primary)

- **API URL**: `https://api.sms-activate.ae/stubs/handler_api.php`
- **Capabilities**: Activation + RENT
- **Countries**: 187+ with RENT support in 40+
- **Services**: 1,684 tracked

### Key API Endpoints Used:

```
getNumberV2      - Buy activation number (JSON response)
getStatus        - Check SMS status
setStatus        - Update status (8=cancel, 1=ready)
getRentNumber    - Rent long-term number
setRentStatus    - Update rental status
getRentServicesAndCountries - Get rent availability/prices
```

### Service Code Mapping

```typescript
const SERVICE_CODE_MAP = {
  google: "go",
  whatsapp: "wa",
  telegram: "tg",
  facebook: "fb",
  instagram: "ig",
  twitter: "tw",
  discord: "ds",
  microsoft: "mm",
  amazon: "am",
  netflix: "nf",
  uber: "ub",
  tiktok: "tk",
};
```

### Country Code Mapping

```typescript
const COUNTRY_CODE_MAP = {
  'usa': 187, 'france': 78, 'germany': 27,
  'uk': 12, 'russia': 0, 'india': 22,
  'brazil': 45, 'indonesia': 6, ...
}
```

---

## 🔐 Authentication

### Methods

- **Google OAuth** (primary)
- **Email/Password** (available)

### Auth Flow

```
1. User clicks "Sign in with Google"
2. Supabase Auth handles OAuth flow
3. on_auth_user_created trigger creates user profile
4. Frontend stores session in Zustand (authStore)
5. All API calls include Authorization header
```

### Admin Access

- Admins identified by `role = 'admin'` in users table
- Protected routes via `AdminRoute` component
- Admin pages under `/admin/*`

---

## 📈 Frontend Architecture

### State Management

- **React Query**: Server state (services, countries, activations)
- **Zustand**: Client state (auth, UI)

### Key Hooks

```typescript
useSmsPolling(); // Poll for SMS every 3s
useRentPolling(); // Poll rental inbox
useRealtimeSms(); // Supabase realtime subscription
```

### Routing Structure

```
/                    - HomePage (landing)
/dashboard           - DashboardPage (main activation UI)
/rent                - RentPage (long-term rental)
/catalog             - CatalogPage
/my-numbers          - MyNumbersPage
/history             - HistoryPage
/transactions        - TransactionsPage
/topup               - TopUpPage
/settings            - SettingsPage
/admin/*             - Admin pages (14 total)
```

---

## 🚀 Deployment

### Frontend

- **Build**: Vite (`npm run build`)
- **Host**: Likely Vercel/Netlify (needs verification)
- **Domain**: onesms-sn.com

### Backend (Supabase)

- **Project**: htfqmamvmhdoixqcbbbw.supabase.co
- **Edge Functions**: Deployed via `supabase functions deploy`
- **Database**: PostgreSQL with pgvector extension

### Environment Variables

```env
# Supabase
SUPABASE_URL=https://htfqmamvmhdoixqcbbbw.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# SMS Provider
SMS_ACTIVATE_API_KEY=d29edd5e1d04c3127d5253d5eAe70de8

# Payments
MONEROO_SECRET_KEY=...
MONEYFUSION_API_KEY=...
PAYTECH_API_KEY=...

# Other
LOGO_DEV_API_KEY=pk_acOeajbNRKGsSDnJvJrcfw
APP_URL=https://onesms-sn.com
```

---

## ✅ Recent Fixes Applied

### RENT System

1. ✅ **Sorting Fixed**: Services/Countries ordered by `popularity_score DESC`
2. ✅ **Dynamic Pricing**: Real-time prices from SMS-Activate API
3. ✅ **Country Code Mapping**: Proper conversion (usa→187, france→78)
4. ✅ **sync-rent-services**: 165 RENT services synchronized

### Code Changes

```typescript
// RentPage.tsx - Fixed queries
.order('popularity_score', { ascending: false })

// get-rent-services/index.ts - Added mapping
const COUNTRY_CODE_MAP = { 'usa': 187, 'france': 78, ... }
```

---

## ⚠️ Potential Issues & Recommendations

### 1. Security

- [ ] API keys hardcoded in some files (move all to env)
- [ ] CORS set to `*` (restrict in production)
- [ ] Rate limiting not implemented

### 2. Performance

- [ ] DashboardPage.tsx is 2005 lines (split into components)
- [ ] No pagination on services/countries lists
- [ ] Consider caching API responses

### 3. Error Handling

- [ ] Some Edge Functions lack detailed error responses
- [ ] Frontend error boundaries missing
- [ ] Retry logic inconsistent

### 4. Missing Features

- [ ] Email notifications for SMS received
- [ ] Webhook for SMS delivery (push instead of poll)
- [ ] Bulk activation support
- [ ] Referral program

### 5. Database

- [ ] 0 rentals in production (feature may need testing)
- [ ] Consider archiving old activations
- [ ] Add indexes for common queries

---

## 📊 Statistics Summary

| Metric              | Value                   |
| ------------------- | ----------------------- |
| Total Pages         | 27 (13 main + 14 admin) |
| Total Lines (Pages) | ~10,900                 |
| Edge Functions      | 47                      |
| Edge Function Lines | ~9,800                  |
| Services in DB      | 1,684                   |
| Countries in DB     | 337                     |
| Registered Users    | 9                       |
| Total Activations   | 66                      |
| Active Rentals      | 0                       |

---

## 🔄 Data Flow Diagrams

### Activation Purchase Flow

```
User selects service → User selects country → User confirms price
                                                      │
                                                      ▼
                                    Edge Function: buy-sms-activate-number
                                                      │
                                                      ▼
                                    ┌─────────────────────────────────┐
                                    │ 1. Verify user auth             │
                                    │ 2. Check balance                │
                                    │ 3. Call SMS-Activate API        │
                                    │ 4. Create activation record     │
                                    │ 5. Deduct user balance          │
                                    │ 6. Return phone number          │
                                    └─────────────────────────────────┘
                                                      │
                                                      ▼
                                    Frontend polls check-sms-activate-status
                                                      │
                                    SMS received? ────┴──── Yes: Show code
                                                            Update status
```

### Payment Flow (Moneroo)

```
User selects package → User clicks Pay
              │
              ▼
Edge Function: init-moneroo-payment
              │
              ▼
┌─────────────────────────────────┐
│ 1. Verify user auth             │
│ 2. Create pending transaction   │
│ 3. Call Moneroo API             │
│ 4. Return checkout_url          │
└─────────────────────────────────┘
              │
              ▼
User redirected to Moneroo checkout
              │
              ▼
User completes payment
              │
              ▼
Moneroo calls webhook: moneroo-webhook
              │
              ▼
┌─────────────────────────────────┐
│ 1. Verify webhook signature     │
│ 2. Update transaction status    │
│ 3. Add credits to user balance  │
│ 4. Create credits_history       │
└─────────────────────────────────┘
```

---

_Generated by Platform Analysis Tool_
