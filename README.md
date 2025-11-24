# One SMS - Plateforme de Numéros Virtuels

## Description
Plateforme web et mobile pour attribution et réception de numéros virtuels temporaires destinés à la réception de SMS de vérification.

## Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **APIs**: 5sim.net + Paytech
- **Notifications**: Firebase Cloud Messaging

## Fonctionnalités Principales
- Authentification (Google, Apple, Email/Password)
- Achat par Activation (usage unique)
- Location (courte et longue durée)
- Gestion des crédits avec Paytech
- Réception SMS en temps réel (webhook)
- Dashboard utilisateur et admin
- Gestion dynamique des prix et marges
- Multilingue (FR/EN)

## Installation

### Prérequis
- Node.js 18+
- npm ou yarn
- Compte Supabase
- Clés API 5sim.net
- Clés API Paytech

### Configuration

1. Cloner le projet
```bash
git clone <repository-url>
cd one-sms-v1
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
```bash
cp .env.example .env
# Éditer .env avec vos clés API
```

4. Lancer le serveur de développement
```bash
npm run dev
```

5. Build pour la production
```bash
npm run build
```

## Structure du Projet
```
src/
├── components/        # Composants React réutilisables
│   ├── ui/           # Composants UI shadcn
│   ├── layout/       # Layout components
│   └── features/     # Composants métier
├── pages/            # Pages de l'application
├── lib/              # Utilitaires et configurations
│   ├── supabase.ts   # Client Supabase
│   ├── api/          # Services API
│   └── utils/        # Fonctions utilitaires
├── hooks/            # Custom React hooks
├── stores/           # État global (Zustand)
├── types/            # Types TypeScript
├── locales/          # Fichiers de traduction
└── styles/           # Styles globaux
```

## API 5sim.net
- Documentation: https://5sim.net/docs
- Base URL: https://5sim.net/v1
- Endpoints principaux:
  - GET /guest/products - Liste des services
  - GET /guest/countries - Liste des pays
  - GET /guest/prices - Prix des numéros
  - POST /user/buy/activation - Acheter activation
  - POST /user/buy/hosting - Louer numéro

## API Paytech
- Documentation: https://docs.intech.sn/doc_paytech.php
- Base URL: https://paytech.sn/api
- Endpoints principaux:
  - POST /payment/request-payment - Demande de paiement
  - GET /payment/get-status - Statut paiement
  - POST /payment/ipn - Webhook notifications

## Base de Données Supabase

### Tables principales:
- users - Utilisateurs
- credits - Gestion crédits
- virtual_numbers - Numéros virtuels
- sms_received - SMS reçus
- transactions - Historique transactions
- services - Services disponibles
- countries - Pays disponibles
- pricing_rules - Règles de tarification

## Sécurité
- JWT pour l'authentification
- Row Level Security (RLS) sur Supabase
- HTTPS obligatoire
- Conformité RGPD

## Support
Pour toute question: support@onesms.com

## Licence
Propriétaire - Tous droits réservés
