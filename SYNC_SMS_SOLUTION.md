# 🔄 Récupération des SMS via Sync API

## 🎯 Problème

Le numéro **6283187992496** a reçu un SMS sur SMS-Activate mais :

- L'activation a été marquée `STATUS_CANCEL` trop tôt
- Le SMS existe toujours dans l'API SMS-Activate
- Notre plateforme ne l'a pas récupéré

## ✅ Solution: API `getActiveActivations`

SMS-Activate a une API spéciale qui retourne **TOUTES les activations actives avec leurs SMS** :

### Réponse de l'API

```json
{
  "status": "success",
  "activeActivations": [
    {
      "activationId": "4450380782",
      "phoneNumber": "6283187992496",
      "smsCode": ["123456"], // ← LE CODE
      "smsText": ["Your code is..."], // ← LE TEXTE COMPLET
      "activationStatus": "4",
      "serviceCode": "wa",
      "countryCode": "6"
    }
  ]
}
```

**Avantage:** Récupère les SMS même si l'activation a été annulée après !

## 🚀 Nouvelle Edge Function Créée

**Nom:** `sync-sms-activate-activations`

**Fonction:**

1. Appelle `getActiveActivations` sur SMS-Activate
2. Récupère TOUTES les activations actives avec SMS
3. Compare avec notre base de données
4. Met à jour les activations qui ont reçu des SMS
5. Charge l'utilisateur et finalise la transaction

**Status:** ✅ Déployée

## 📱 Comment Utiliser

### Option 1: Appel Direct (IMMÉDIAT)

Dans votre navigateur, console (F12) :

```javascript
const { data, error } = await supabase.functions.invoke(
  "sync-sms-activate-activations"
);
console.log("Résultat:", data);
```

**Ou via cURL:**

```bash
curl -X POST 'https://htfqmamvmhdoixqcbbbw.supabase.co/functions/v1/sync-sms-activate-activations' \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Option 2: Ajouter un Cron Job (AUTOMATIQUE)

Créer un Cron qui appelle cette fonction toutes les 30 secondes pour synchroniser automatiquement.

## 🧪 Test pour Votre Numéro

1. **Vérifier l'état actuel:**

```sql
SELECT phone, status, sms_code, sms_text, order_id
FROM activations
WHERE phone = '6283187992496';
```

2. **Appeler la fonction de sync:**

```javascript
const { data } = await supabase.functions.invoke(
  "sync-sms-activate-activations"
);
// data = { synced: 1, updated: 1, message: "..." }
```

3. **Re-vérifier après sync:**

```sql
SELECT phone, status, sms_code, sms_text
FROM activations
WHERE phone = '6283187992496';
```

**Résultat attendu:**

- `status` → 'received' ✅
- `sms_code` → Le code du SMS ✅
- `sms_text` → Le texte complet ✅

## 🔧 Intégration dans le Polling

Pour automatiser, modifiez le hook `useSmsPolling` pour appeler cette fonction de backup :

```typescript
// Si getStatusV2 échoue, essayer la sync globale
if (checkData.data?.status === "cancelled" || checkError) {
  console.log("🔄 Tentative de sync globale...");
  const { data: syncData } = await supabase.functions.invoke(
    "sync-sms-activate-activations"
  );

  if (syncData?.updated > 0) {
    console.log("✅ SMS récupéré via sync!");
    // Re-check l'activation
    refetchActivations();
  }
}
```

## 📊 Avantages

| Méthode              | getStatusV2       | getActiveActivations (Sync) |
| -------------------- | ----------------- | --------------------------- |
| **Scope**            | 1 activation      | Toutes les activations      |
| **SMS après cancel** | ❌ Non            | ✅ Oui                      |
| **Texte complet**    | ✅ Oui            | ✅ Oui                      |
| **Performance**      | Rapide            | Plus lent (mais global)     |
| **Usage**            | Polling principal | Backup / Récupération       |

## 🎯 Workflow Recommandé

```
1. Polling normal (getStatusV2)
   ↓
2. Si STATUS_CANCEL mais SMS potentiellement reçu
   ↓
3. Appeler sync-sms-activate-activations (backup)
   ↓
4. Récupérer les SMS manqués
```

## 💡 Pour Récupérer le SMS Maintenant

**Exécutez immédiatement dans la console navigateur:**

```javascript
// 1. Appeler la fonction de sync
const result = await supabase.functions.invoke("sync-sms-activate-activations");
console.log("Sync result:", result);

// 2. Vérifier si le SMS a été trouvé
if (result.data.updated > 0) {
  console.log("✅ SMS récupéré!");

  // 3. Recharger les activations
  const { data: activation } = await supabase
    .from("activations")
    .select("*")
    .eq("phone", "6283187992496")
    .single();

  console.log("Activation mise à jour:", activation);
}
```

## 🚨 Important

Cette fonction récupère **uniquement les activations encore actives** sur SMS-Activate.

Si l'activation a déjà expiré côté SMS-Activate (>20 min), le SMS est perdu définitivement.

**Pour votre cas:** Si le numéro vient d'être acheté (18:03), vous avez jusqu'à ~18:23 pour récupérer le SMS via cette méthode.

## ✅ Action Immédiate

**TESTEZ MAINTENANT pendant que l'activation est encore active sur SMS-Activate !**

Ouvrez votre plateforme et dans la console (F12) :

```javascript
const { data } = await supabase.functions.invoke(
  "sync-sms-activate-activations"
);
console.log(data);
```

Si `data.updated > 0` → SMS récupéré ! 🎉
