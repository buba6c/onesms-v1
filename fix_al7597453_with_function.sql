-- ============================================
-- CORRECTION pour al7597453@gmail.com
-- Utilise la fonction admin_unfreeze_orphaned_balance
-- ============================================

-- ÉTAPE 1: Créer la fonction (si elle n'existe pas déjà)
-- Copier tout le contenu de scripts/create_unfreeze_orphaned_balance_function.sql
-- Et l'exécuter d'abord dans Supabase SQL Editor

-- ÉTAPE 2: Utiliser la fonction pour libérer les fonds orphelins
SELECT * FROM admin_unfreeze_orphaned_balance('al7597453@gmail.com');

-- ÉTAPE 3: Ajuster manuellement la balance de 140 à 120 (si besoin)
-- Seulement SI la fonction ne ramène pas déjà à 120
-- (La fonction ajoute l'orphan au balance, donc peut-être que ça donnera plus que 120)

-- RÉSULTAT ATTENDU:
-- user_email: al7597453@gmail.com
-- unfrozen_amount: 116
-- new_balance: 256 (140 + 116)
-- status: SUCCESS

-- Si vous voulez 120 final au lieu de 256, il faudra ajuster après
