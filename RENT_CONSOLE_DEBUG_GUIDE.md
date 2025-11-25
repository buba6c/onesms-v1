# 🔍 Checklist Debug Rent - Console Browser

## 📊 Logs à Vérifier dans Console Browser (F12)

### 1. Au Chargement de la Page
```
✅ Attendu:
[REALTIME] WebSocket connecté avec succès
```

### 2. Quand on Sélectionne un Service en Mode Rent
```
✅ Attendu:
🌐 [LIVE] Chargement pays mode=rent service=amazon
🏠 [RENT] Récupération pays pour location (4hours)...
📡 [RENT] Response: {success: true, countries: {...}, services: {...}}

❌ Si erreur:
⚠️ [RENT] Service amazon pas disponible pour location
🔄 [RENT] Fallback sur service any (Any other): cost=42.93
✅ [RENT] 15 pays disponibles (via any (Any other))
```

### 3. Quand on Clique sur Rent/Activate
```
✅ Attendu:
🔍 [RENT] SMS-Activate sélectionnera automatiquement le meilleur opérateur
📤 [RENT] Envoi à buy-sms-activate-rent: {country: "russia", product: "wa", duration: "4hours"}
📥 [RENT] Réponse: {buyData: {...}, buyError: null}
✅ [RENT] Numéro acheté: {id: 123, phone: "+7995...", ...}
```

### 4. Edge Function Logs (Backend)
```
✅ Attendu dans logs Supabase:
🚀 [BUY-RENT] Function called
📞 [BUY-RENT] Request: {country: "russia", product: "wa", duration: "4hours"}
💰 [BUY-RENT] Checking available rent options...
💰 [BUY-RENT] Available services: {wa: {cost: 21.95, quant: 20}}
✅ [BUY-RENT] Service wa found: 21.95
💰 [BUY-RENT] Rent price: $21.95 for 4 hours using service: wa
🌐 [BUY-RENT] API Call: ...&action=getRentNumber&service=wa&...
📥 [BUY-RENT] API Response: {status: "success", phone: {...}}
📞 [BUY-RENT] Number rented: {rentId: 1049, phone: "+79959707564"}
✅ [BUY-RENT] Success
```

## 🚨 Erreurs Possibles et Solutions

### Erreur 1: "Service not available"
```javascript
❌ Console:
⚠️ [RENT] Service amazon pas disponible pour location
❌ [BUY-RENT] Service am not available, trying fallback...
❌ Error: Rent not available for Amazon in russia for 4hours

✅ Solution:
- Vérifier que le fallback vers "any" ou "full" fonctionne
- L'Edge Function doit maintenant gérer ça automatiquement
```

### Erreur 2: "NO_BALANCE"
```javascript
❌ Response: {status: "error", message: "NO_BALANCE"}

✅ Solution:
- Votre compte SMS-Activate n'a pas assez de fonds
- Vérifier balance sur https://sms-activate.org
```

### Erreur 3: "NO_NUMBERS"
```javascript
❌ Response: {status: "error", message: "NO_NUMBERS"}

✅ Solution:
- Aucun numéro disponible pour ce service/pays/durée
- Essayer un autre pays ou service universel "any"
```

### Erreur 4: "Insufficient balance"
```javascript
❌ Error: Insufficient balance. Required: 21.95Ⓐ, Available: 5Ⓐ

✅ Solution:
- Balance utilisateur insuffisante
- Aller dans Top up pour recharger
```

### Erreur 5: API URL incorrecte (CORRIGÉ)
```javascript
❌ Avant:
Failed to fetch: api.sms-activate.ae

✅ Maintenant:
api.sms-activate.org (déployé)
```

## 🧪 Test Manuel dans Console

Collez ce code dans la console browser (F12):

```javascript
// Test 1: Vérifier get-rent-services
const testServices = await supabase.functions.invoke('get-rent-services', {
  body: { rentTime: '4' }
});
console.log('Services disponibles:', testServices);

// Test 2: Vérifier service spécifique
const services = testServices.data.services;
console.log('WhatsApp (wa):', services.wa);
console.log('Any other (any):', services.any);
console.log('Full rent (full):', services.full);

// Test 3: Liste tous les services
console.log('Tous les services:', Object.keys(services));
```

## 📋 Informations à Fournir pour Debug

Si ça ne fonctionne toujours pas, donnez-moi:

1. **Screenshot console** avec logs [RENT] et [BUY-RENT]
2. **Service sélectionné** (WhatsApp, Amazon, etc.)
3. **Pays sélectionné** (Russia, USA, etc.)
4. **Durée choisie** (4hours, 1day, etc.)
5. **Message d'erreur exact** en rouge dans console
6. **Votre balance** (solde disponible)

## 🔗 Vérifications Rapides

### Check 1: Edge Function déployée
```bash
supabase functions list
# Devrait montrer: buy-sms-activate-rent
```

### Check 2: Variables d'environnement
- `SMS_ACTIVATE_API_KEY` doit être définie
- Vérifier dans dashboard Supabase → Edge Functions → Secrets

### Check 3: Mode Rent activé
- Toggle "Activation/Rent" en haut à gauche doit être sur "Rent"
- Sidebar doit montrer "Any other ❓" et "Full rent 🏠"

### Check 4: Service dans DB
```sql
SELECT * FROM services WHERE code = 'wa';
-- Doit retourner WhatsApp
```

## 🎯 Actions Prioritaires

1. ✅ **Vérifier console browser** - Partager logs
2. ✅ **Tester avec WhatsApp** - Service garanti disponible
3. ✅ **Vérifier balance SMS-Activate** - Sur leur site
4. ✅ **Confirmer Edge Function déployée** - Via dashboard
