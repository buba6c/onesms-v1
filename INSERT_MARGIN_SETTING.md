# 📝 Ajout du Paramètre de Marge

## SQL à exécuter depuis Supabase Dashboard

Allez sur https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/editor

Exécutez cette requête SQL :

```sql
-- Ajouter le paramètre de marge globale
INSERT INTO system_settings (key, value, category, description)
VALUES (
  'pricing_margin_percentage',
  '30',
  'pricing',
  'Marge automatique appliquée sur les prix SMS-Activate (en %)'
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value,
    category = EXCLUDED.category,
    description = EXCLUDED.description;
```

## Vérifier l'ajout

```sql
SELECT * FROM system_settings WHERE key = 'pricing_margin_percentage';
```

## Utilisation

Une fois ajouté, vous pourrez modifier la marge depuis **Admin → Settings → Pricing** 

La marge sera appliquée automatiquement lors du calcul des prix.

**Exemple :**
- Prix SMS-Activate: $0.50
- Conversion: $0.50 × 600 = 300 FCFA
- En pièces: 300 ÷ 100 = 3 Ⓐ
- **Marge 30%**: 3 × 1.3 = **3.9 Ⓐ** → arrondi à **4 Ⓐ**

Si vous changez la marge à 40% :
- **Marge 40%**: 3 × 1.4 = **4.2 Ⓐ** → arrondi à **5 Ⓐ**
