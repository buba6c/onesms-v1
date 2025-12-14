# 🔧 Forcer la Vérification du SMS Manuellement

## Situation

- **Numéro:** 6283187992496
- **Status:** pending (en attente)
- **SMS visible sur SMS-Activate:** OUI
- **SMS dans la plateforme:** NON (null)

## Solution: Appeler l'Edge Function Manuellement

### Étape 1: Obtenir l'Activation ID

```sql
SELECT id, order_id FROM activations WHERE phone = '6283187992496';
```

**Résultat attendu:**

```
id: 123abc... (UUID)
order_id: 987654321 (numéro SMS-Activate)
```

### Étape 2: Appeler l'Edge Function via API

Vous pouvez tester de 2 façons:

#### Option A: Via le Dashboard (Page Active Numbers)

1. **Ouvrir votre plateforme:** Dashboard → Active Numbers
2. **Actualiser la page** (F5 ou Cmd+R)
3. Le polling devrait détecter le numéro en `pending` et vérifier automatiquement

#### Option B: Via cURL (Test direct)

Remplacez `YOUR_ACTIVATION_ID` par l'ID obtenu à l'étape 1:

```bash
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/check-sms-activate-status' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "activationId": "YOUR_ACTIVATION_ID"
  }'
```

**Vous devriez obtenir:**

```json
{
  "success": true,
  "data": {
    "status": "received",
    "sms_code": "123456",
    "sms_text": "Your verification code is 123456..."
  }
}
```

### Étape 3: Vérifier le résultat dans la DB

```sql
SELECT
  phone,
  status,
  sms_code,
  sms_text,
  updated_at
FROM activations
WHERE phone = '6283187992496';
```

**Si ça a marché:**

- status = 'received'
- sms_code = le code
- sms_text = le texte complet

## 🐛 Si ça ne marche toujours pas

### Vérifier l'API SMS-Activate directement

Test manuel de leur API (remplacez ORDER_ID par votre order_id):

```bash
curl "https://api.sms-activate.ae/stubs/handler_api.php?api_key=YOUR_API_KEY&action=getStatusV2&id=ORDER_ID"
```

**Réponses possibles:**

1. **SMS reçu (succès):**

```json
{
  "sms": {
    "code": "123456",
    "text": "Your code is 123456",
    "dateTime": "2025-11-24 18:05:00"
  }
}
```

2. **Encore en attente:**

```
STATUS_WAIT_CODE
```

3. **Annulé:**

```
STATUS_CANCEL
```

### Problèmes courants

#### Problème 1: STATUS_WAIT_CODE

**Cause:** Le SMS n'est pas encore disponible via l'API
**Solution:** Attendre 30 secondes et réessayer

#### Problème 2: NO_ACTIVATION

**Cause:** L'order_id est invalide ou l'activation est expirée
**Solution:** Vérifier l'order_id dans la DB

#### Problème 3: BAD_KEY

**Cause:** Clé API invalide ou expirée
**Solution:** Vérifier la variable d'environnement `SMS_ACTIVATE_API_KEY` dans Supabase

## 🎯 Solution Rapide

**Pour débloquer immédiatement:**

1. **Ouvrez votre Dashboard dans le navigateur**
2. **Ouvrez la console (F12)**
3. **Collez ce code:**

```javascript
// Forcer la vérification
const { data, error } = await supabase.functions.invoke(
  "check-sms-activate-status",
  {
    body: {
      activationId: "YOUR_ACTIVATION_ID", // Remplacer par l'ID
      userId: "YOUR_USER_ID", // Remplacer par votre user ID
    },
  }
);

console.log("Résultat:", data, error);
```

4. **Regardez le résultat dans la console**

Si `data.data.status === 'received'` → ✅ SMS récupéré !

## ⏰ Pourquoi le Polling n'a pas fonctionné ?

Causes possibles:

1. **Dashboard pas ouvert**

   - Le hook `useSmsPolling` ne démarre que si la page est ouverte
   - Solution: Ouvrir la page Dashboard

2. **Polling désactivé temporairement**

   - Si l'utilisateur change de page, le polling s'arrête
   - Solution: Rester sur la page Dashboard

3. **Erreur JavaScript silencieuse**

   - Vérifier la console navigateur (F12)
   - Solution: Corriger les erreurs JS

4. **API SMS-Activate lente**
   - Délai entre réception SMS et disponibilité API
   - Solution: Attendre et réessayer

## 📝 Note Importante

**Le fix déployé (API V2) est maintenant actif.**

Si vous forcez la vérification maintenant avec l'Edge Function mise à jour, vous **devriez obtenir le texte complet du SMS** (pas juste le code).

Testez et dites-moi le résultat ! 🚀
