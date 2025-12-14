# Migration des Packages d'Activation

## ⚠️ IMPORTANT - Étape à effectuer MAINTENANT

Pour activer la gestion des packages de recharge, vous devez exécuter la migration SQL dans Supabase.

## Instructions

### Méthode 1 : Via l'éditeur SQL Supabase (RECOMMANDÉ)

1. Ouvrez votre dashboard Supabase : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw

2. Allez dans **SQL Editor** (menu de gauche)

3. Cliquez sur **New Query**

4. Copiez-collez le contenu du fichier `RUN_PACKAGES_MIGRATION_IN_SUPABASE_SQL.sql`

5. Cliquez sur **Run** (ou Ctrl+Enter)

6. Vous devriez voir le message : "Migration activation_packages terminée avec succès!"

### Vérification

Après l'exécution, vérifiez que tout fonctionne :

1. Allez sur http://localhost:3000/top-up

   - Les packages doivent s'afficher dynamiquement depuis la base de données

2. Connectez-vous en tant qu'admin et allez sur http://localhost:3000/admin/packages
   - Vous pouvez maintenant gérer les packages :
     - Créer de nouveaux packages
     - Modifier les prix (XOF, EUR, USD)
     - Activer/désactiver des packages
     - Marquer un package comme "Populaire"
     - Définir les pourcentages d'économie
     - Réorganiser l'ordre d'affichage

## Fonctionnalités ajoutées

### Page TopUp (/top-up)

- ✅ Chargement dynamique des packages depuis la base de données
- ✅ Support de 3 devises : XOF, EUR, USD
- ✅ Design responsive (mobile, tablet, desktop)
- ✅ Badges "Populaire" et "Économie"
- ✅ Affichage intelligent du prix par activation

### Page Admin (/admin/packages)

- ✅ Gestion complète des packages
- ✅ Création/Modification/Suppression
- ✅ Toggle actif/inactif en temps réel
- ✅ Validation des champs
- ✅ Interface intuitive

## Structure de la table

```sql
activation_packages (
  id UUID,
  activations INTEGER,        -- Nombre d'activations
  price_xof DECIMAL(10,2),   -- Prix en FCFA
  price_eur DECIMAL(10,2),   -- Prix en Euros
  price_usd DECIMAL(10,2),   -- Prix en Dollars
  is_popular BOOLEAN,         -- Badge "Populaire"
  savings_percentage INTEGER, -- Pourcentage d'économie
  is_active BOOLEAN,          -- Visible/Caché
  display_order INTEGER,      -- Ordre d'affichage
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Packages par défaut

| Activations | XOF    | EUR   | USD   | Populaire | Économie |
| ----------- | ------ | ----- | ----- | --------- | -------- |
| 5           | 2,000  | 2.99  | 3.29  | Non       | 0%       |
| 10          | 3,500  | 4.99  | 5.49  | **Oui**   | 10%      |
| 20          | 6,000  | 8.99  | 9.89  | Non       | 15%      |
| 50          | 13,000 | 19.99 | 21.99 | Non       | 20%      |
| 100         | 23,000 | 34.99 | 38.49 | Non       | 25%      |
| 200         | 40,000 | 59.99 | 65.99 | Non       | 30%      |

## Support

Si vous rencontrez des problèmes, vérifiez :

1. La connexion à Supabase
2. Les permissions RLS (Row Level Security)
3. Les logs dans l'éditeur SQL
