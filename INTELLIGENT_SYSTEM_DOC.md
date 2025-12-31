# 🧠 Documentation: Intelligent Provider System (Global Upgrade)

Ce document décrit le fonctionnement du **Système de Rotation Intelligente** mis en place le 30 Décembre 2025.

## 🎯 Objectif
Maximiser le taux de succès des SMS en choisissant automatiquement le meilleur fournisseur pour chaque service, basé sur l'expérience collective de tous les utilisateurs.

## ⚙️ Architecture

Le système repose sur 3 piliers :

### 1. La Mémoire Collective (`provider_performance`)
Une table SQL qui stocke les statistiques de succès pour chaque couple (Fournisseur + Service).
- **Mise à jour :** Automatique (via Cron/Fonction).
- **Score :** Pourcentage de réussite (Success / Attempts * 100).
- **Unique :** Chaque service a son classement.

### 2. L'Analyste (`cron-provider-stats`)
Une Edge Function qui s'exécute périodiquement (recommandé : 1h).
- **Tâche :** Scanne les activations des dernières 72h.
- **Action :** Recalcule les scores et met à jour la table `provider_performance`.
- **Résultat :** Le système détecte les tendances (ex: "SMSPVA est en panne sur Telegram", "5sim fonctionne mieux sur WhatsApp").

### 3. Le Décideur (`predict-best-provider`)
Une Edge Function appelée avant chaque achat. Elle applique une logique hybride :

1.  **Veto Personnel (Priorité 1) :**
    - *"L'utilisateur a-t-il échoué avec ce fournisseur récemment ?"*
    - Si OUI -> On évite ce fournisseur (même s'il est bon globalement pour les autres).

2.  **Intelligence Globale (Priorité 2) :**
    - *"Quel est le fournisseur avec le meilleur score global ?"*
    - On sélectionne le N°1 du classement (sauf s'il est vetoed, alors le N°2).

3.  **Rotation (Fallback) :**
    - Si pas de données, on utilise un cycle prédéfini.

## 🚀 Maintenance

Pour que le système reste performant, une action automatique est requise :

- **Cron Job :** Créer une tâche planifiée dans le dashboard Supabase.
- **Fréquence :** Toutes les heures (`0 * * * *`).
- **Commande :** Appel HTTP POST vers `cron-provider-stats`.

---
*Ce système permet une auto-réparation du service : si un fournisseur tombe, son score chute, et le trafic est automatiquement redirigé vers les autres fournisseurs fonctionnels.*
