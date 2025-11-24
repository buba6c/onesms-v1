# 🔧 Configuration 5sim pour ONE SMS V1

## ✅ Étapes déjà complétées

1. ✅ Colonne `delivery_rate` ajoutée à la table `pricing_rules`
2. ✅ Script de synchronisation mis à jour pour récupérer les `rate` depuis 5sim
3. ✅ Badges intelligents configurés (vert ≥95%, jaune 85-94%, orange 70-84%, rouge <70%)
4. ✅ Système de polling SMS actif (vérification toutes les 5 secondes)
5. ✅ Webhook SMS Edge Function prêt (`sms-webhook`)

---

## 📊 Étape 2 : Lancer la synchronisation des données

### Via l'interface Admin

1. **Connecte-toi en tant qu'admin** : https://onesms.yourdomain.com/admin
2. **Va dans "Services"** ou la section sync
3. **Clique sur "Sync from 5sim"**
4. **Attends la fin** (30-60 secondes)
5. **Vérifie les badges** → Les pays avec bon taux auront des badges **verts** 🟢

### Résultat attendu
```
✅ 150+ services synchronisés
✅ 180+ pays synchronisés  
✅ 50,000+ règles de prix avec delivery_rate
✅ Badges de couleur selon vrais taux de 5sim
```

---

## 📲 Étape 3 : Configurer le Webhook SMS (OPTIONNEL mais recommandé)

### Pourquoi ?
- **Sans webhook** : Le système fonctionne avec polling (vérification toutes les 5s) ✅
- **Avec webhook** : Notifications **instantanées** + moins de charge serveur 🚀

### Configuration sur 5sim.net

1. **Connecte-toi sur** : https://5sim.net/settings/api
2. **Trouve la section "Webhooks"**
3. **Configure le webhook** :

   ```
   Webhook URL: https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sms-webhook
   Method: POST
   Content-Type: application/json
   Events: SMS Received, Order Status Changed
   ```

4. **Teste le webhook** en achetant un numéro test

### Vérifier que ça marche

```bash
# Dans les logs Supabase (Functions → sms-webhook → Logs)
Received webhook: { id: 12345, phone: "+123...", sms: [...] }
✅ SMS saved to database
✅ User charged successfully
```

---

## 🎨 Comprendre les badges de taux de réussite

### Codes couleur

| Couleur | Taux | Signification | Exemple |
|---------|------|---------------|---------|
| 🟢 **Vert** | ≥ 95% | Excellent - Très fiable | USA, UK, France |
| 🟡 **Jaune** | 85-94% | Bon - Fiable | Espagne, Italie |
| 🟠 **Orange** | 70-84% | Moyen - Acceptable | Certains pays émergents |
| 🔴 **Rouge** | < 70% | Faible - Risqué | Pays avec peu d'opérateurs |

### Données utilisées

1. **Avec `delivery_rate` en DB** (après sync) :
   - Utilise le taux **réel** de l'API 5sim
   - Moyenne des taux par opérateur pour chaque pays+service
   
2. **Sans `delivery_rate`** (fallback) :
   - Estimation basée sur :
     - Stock disponible (plus de stock = meilleur taux estimé)
     - Prix (prix bas = généralement meilleur taux)

### Formule d'estimation (fallback)
```typescript
const stockScore = Math.min(100, (totalStock / 1000) * 10);
const priceScore = Math.max(70, 100 - (avgPrice * 5));
const estimatedRate = (stockScore + priceScore) / 2;
```

---

## 🔍 Structure de l'API 5sim

### Endpoint Prices
```
GET https://5sim.net/v1/guest/prices
```

### Réponse (exemple)
```json
{
  "england": {
    "facebook": {
      "vodafone": {
        "cost": 4,
        "count": 1260,
        "rate": 99.99  ← Taux de livraison en %
      },
      "virtual60": {
        "cost": 4,
        "count": 935,
        "rate": 98.50
      }
    }
  }
}
```

### Champs importants
- **`cost`** : Prix d'achat (en roubles)
- **`count`** : Nombre de numéros disponibles
- **`rate`** : Taux de réussite (%) - **omis si < 20% ou trop peu de commandes**

---

## 📱 Système de réception SMS

### 1. Polling automatique (ACTIF par défaut)

**Fichier** : `src/hooks/useSmsPolling.ts`

**Fonctionnement** :
```
1. Achat d'un numéro → Status: "waiting"
2. Polling démarre automatiquement (toutes les 5s)
3. Appelle check-5sim-sms Edge Function
4. Vérifie le status chez 5sim
5. Si SMS reçu → Update status + facture user + rafraîchit solde
6. Si timeout (15 min) → Rembourse automatiquement
7. Arrête après 25 minutes (sécurité)
```

**Avantages** :
- ✅ Fonctionne sans configuration
- ✅ Pas de dépendance externe
- ✅ Détection fiable

**Inconvénients** :
- ⚠️ Délai de 5 secondes max
- ⚠️ Charge serveur (requêtes régulières)

### 2. Webhook passif (OPTIONNEL)

**Fichier** : `supabase/functions/sms-webhook/index.ts`

**Fonctionnement** :
```
1. 5sim reçoit un SMS
2. 5sim envoie notification webhook à notre serveur
3. Edge Function traite la notification instantanément
4. Update status + facture user
5. Notification toast à l'utilisateur
```

**Avantages** :
- ✅ Instantané (0 délai)
- ✅ Moins de charge serveur
- ✅ Plus efficace

**Configuration requise** :
- ⚠️ Doit être configuré sur 5sim.net
- ⚠️ Nécessite URL publique

### Recommandation
**Utiliser les DEUX** :
- Webhook pour notifications instantanées
- Polling comme backup/fallback

---

## 🧪 Tests de validation

### Test 1 : Badges de couleur
```
1. Va sur le dashboard
2. Sélectionne un service (ex: WhatsApp)
3. Vérifie que les pays ont des badges de différentes couleurs
4. Les pays populaires (USA, UK, France) doivent être verts 🟢
```

### Test 2 : Synchronisation
```
1. Va dans Admin → Services
2. Clique "Sync from 5sim"
3. Vérifie les logs :
   - ✅ X services synced
   - ✅ X countries synced
   - ✅ X pricing rules synced
4. Vérifie en DB que delivery_rate est rempli (pas à 0)
```

### Test 3 : Réception SMS
```
1. Achète un numéro test (pays avec bon taux)
2. Envoie un SMS au numéro via le service
3. Vérifie que le code apparaît dans les 5-10 secondes
4. Vérifie que le solde a été débité
5. Vérifie dans HistoryPage que le statut est "received" avec code visible
```

### Test 4 : Webhook (si configuré)
```
1. Achète un numéro
2. Vérifie les logs Supabase Functions → sms-webhook
3. Tu dois voir "Received webhook: {...}"
4. Le SMS doit apparaître instantanément (< 1 seconde)
```

---

## 📊 Requêtes SQL utiles

### Vérifier les delivery_rate
```sql
-- Top 10 pays par taux de réussite (service Facebook)
SELECT 
  c.name,
  AVG(pr.delivery_rate) as avg_rate,
  COUNT(pr.id) as operators_count,
  SUM(pr.available_count) as total_numbers
FROM pricing_rules pr
JOIN countries c ON c.code = pr.country_code
WHERE pr.service_code = 'facebook'
  AND pr.delivery_rate > 0
  AND pr.active = true
GROUP BY c.name
ORDER BY avg_rate DESC
LIMIT 10;
```

### Vérifier les activations récentes
```sql
-- Dernières 10 activations avec leur status
SELECT 
  id,
  phone,
  service_code,
  country_code,
  status,
  sms_code,
  price,
  charged,
  created_at
FROM activations
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;
```

### Statistiques SMS
```sql
-- Taux de réussite global
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM activations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

---

## 🚨 Dépannage

### Problème : Tous les badges sont orange/rouge

**Solution** :
1. Vérifie que la migration SQL a été appliquée :
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'pricing_rules' AND column_name = 'delivery_rate';
   ```
2. Lance la synchronisation depuis l'admin
3. Vérifie que delivery_rate n'est pas à 0 :
   ```sql
   SELECT COUNT(*) FROM pricing_rules WHERE delivery_rate > 0;
   ```

### Problème : SMS pas reçu

**Solution** :
1. Vérifie les logs du polling : Console DevTools → Voir `[POLLING]` et `[CHECK]`
2. Vérifie que l'Edge Function `check-5sim-sms` fonctionne
3. Teste manuellement sur 5sim.net le numéro
4. Vérifie le solde 5sim API

### Problème : Webhook ne fonctionne pas

**Solution** :
1. Vérifie que l'URL webhook est correcte dans 5sim
2. Vérifie les logs Supabase Functions
3. Teste le webhook avec curl :
   ```bash
   curl -X POST https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sms-webhook \
     -H "Content-Type: application/json" \
     -d '{"id":123,"phone":"+123","sms":[{"code":"12345"}]}'
   ```

---

## ✅ Checklist finale

- [ ] Migration SQL appliquée (`delivery_rate` existe)
- [ ] Synchronisation lancée depuis l'admin
- [ ] Badges affichent différentes couleurs (dont du vert)
- [ ] Test achat numéro : SMS reçu en < 20 secondes
- [ ] Webhook configuré sur 5sim (optionnel)
- [ ] Logs webhook fonctionnent (si configuré)
- [ ] Historique affiche correctement les statuts
- [ ] Numéros expirés affichent "Timeout" et non "Waiting"

---

## 📞 Support

Si tu as des problèmes :
1. Vérifie les logs Supabase Functions
2. Vérifie la console DevTools pour les erreurs frontend
3. Vérifie les logs PM2 : `pm2 logs onesms-frontend`
4. Vérifie le statut de l'API 5sim : https://5sim.net/status

---

**Dernière mise à jour** : 21 novembre 2025
**Version** : 1.0.0
