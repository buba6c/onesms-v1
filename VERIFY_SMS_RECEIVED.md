# 🔍 Vérification: SMS Reçu pour +6283187992496

## ⚠️ Contexte

Vous mentionnez que le numéro **+6283187992496** a reçu un SMS sur SMS-Activate mais vous ne le voyez pas dans votre plateforme.

## 📊 Vérification en 3 Étapes

### Étape 1: Vérifier dans Supabase Dashboard

1. **Aller dans Supabase Dashboard**
   - https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/editor

2. **Exécuter la requête SQL** (fichier `CHECK_SMS_RECEIVED.sql`)
   ```sql
   SELECT 
     id,
     order_id,
     phone,
     service_code,
     status,
     sms_code,
     sms_text,
     created_at,
     expires_at
   FROM activations
   WHERE phone LIKE '%83187992496%'
   ORDER BY created_at DESC;
   ```

3. **Analyser les résultats:**

   **Si aucune ligne retournée:**
   - ❌ L'activation n'existe pas dans la base
   - **Cause possible:** Le numéro a été acheté via SMS-Activate directement (pas via votre plateforme)
   
   **Si ligne existe avec status = 'waiting' ou 'pending':**
   - ⏳ L'activation existe mais le SMS n'a pas encore été détecté
   - **Action:** Vérifier les logs de l'Edge Function
   
   **Si ligne existe avec status = 'received':**
   - ✅ Le SMS a été reçu
   - **Vérifier:** Les champs `sms_code` et `sms_text` doivent être remplis
   
   **Si ligne existe avec status = 'timeout' ou 'cancelled':**
   - ❌ L'activation a expiré ou été annulée
   - **Action:** Vérifier pourquoi le polling s'est arrêté

### Étape 2: Vérifier les Logs des Edge Functions

1. **Aller dans Functions → Logs**
   - https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions

2. **Filtrer par "check-sms-activate-status"**

3. **Chercher les logs contenant "83187992496"**
   - Regarder si l'Edge Function a été appelée
   - Vérifier la réponse de l'API SMS-Activate
   - Identifier les erreurs éventuelles

**Exemples de logs à chercher:**
```
✅ [CHECK-SMS-ACTIVATE] SMS received (V2): { code: "123456", text: "..." }
⏳ [CHECK-SMS-ACTIVATE] Still waiting...
❌ [CHECK-SMS-ACTIVATE] Error: ...
```

### Étape 3: Vérifier sur SMS-Activate Directement

1. **Aller sur SMS-Activate Dashboard**
   - https://sms-activate.ae/en/profile

2. **Chercher l'activation avec +6283187992496**
   - Activations → History
   - Filtrer par numéro

3. **Vérifier:**
   - ✅ Le SMS est-il visible sur SMS-Activate ?
   - 📋 Quel est l'**Activation ID** (order_id) ?
   - ⏰ À quelle heure le SMS a été reçu ?
   - 📄 Quel est le **texte complet** du SMS ?

## 🔧 Scénarios Possibles

### Scénario A: Numéro acheté hors plateforme
**Symptômes:**
- SMS visible sur SMS-Activate
- Aucune trace dans votre base de données

**Cause:**
- Le numéro a été acheté directement via SMS-Activate (pas via votre API)

**Solution:**
- Rien à faire - c'est normal, votre plateforme ne gère que ses propres achats

---

### Scénario B: Polling non déclenché
**Symptômes:**
- Activation existe avec status = 'pending' ou 'waiting'
- Pas de logs dans check-sms-activate-status

**Cause:**
- Le hook `useSmsPolling` n'a pas démarré
- Le composant n'est pas monté

**Solution:**
1. Vérifier que l'utilisateur est sur la page Dashboard
2. Vérifier que activeNumbers contient l'activation
3. Forcer un refresh de la page

---

### Scénario C: Polling échoue silencieusement
**Symptômes:**
- Activation existe
- Logs montrent des appels à l'Edge Function
- Mais status reste 'waiting'

**Cause:**
- L'API V2 retourne un format inattendu
- Erreur de parsing JSON

**Solution:**
1. Regarder les logs pour voir la réponse exacte de l'API
2. Vérifier que le parsing JSON fonctionne
3. Tester manuellement l'API V2:
   ```bash
   curl "https://api.sms-activate.ae/stubs/handler_api.php?api_key=YOUR_KEY&action=getStatusV2&id=ACTIVATION_ID"
   ```

---

### Scénario D: SMS reçu mais pas affiché dans l'UI
**Symptômes:**
- Base de données montre status = 'received'
- sms_code et sms_text sont remplis
- Mais l'utilisateur ne voit rien

**Cause:**
- Frontend ne rafraîchit pas après update
- useQuery cache non invalidé

**Solution:**
1. Forcer un refresh de la page
2. Vérifier que `refetchActivations()` est appelé
3. Vérifier que le composant re-render

## 🎯 Action Immédiate

**Pour savoir si votre plateforme a reçu le code:**

1. **Exécuter cette requête SQL maintenant:**
   ```sql
   SELECT * FROM activations 
   WHERE phone LIKE '%83187992496%'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

2. **Interpréter le résultat:**
   - **0 lignes** → Numéro acheté hors plateforme
   - **status = 'received'** → ✅ SMS reçu, vérifier l'UI
   - **status = 'waiting'** → ⏳ En attente, vérifier le polling
   - **status = 'timeout'** → ❌ Expiré sans SMS

3. **Si status = 'received', vérifier:**
   ```sql
   SELECT sms_code, sms_text FROM activations 
   WHERE phone LIKE '%83187992496%';
   ```
   - Si `sms_code` est NULL → ❌ Problème de parsing
   - Si `sms_code` existe → ✅ SMS bien reçu

## 📝 Note Importante

**Le fix déployé (API V2) s'applique uniquement aux nouveaux SMS.**

Si le numéro +6283187992496 a reçu son SMS **avant** le déploiement:
- ❌ Il utilisait encore l'ancienne API V1
- ❌ Le texte complet n'a pas été récupéré
- ⚠️ Seul le code a été extrait (si extraction réussie)

**Tous les SMS reçus APRÈS le déploiement auront le texte complet.**

## 🚀 Test de Validation

Pour valider que le fix fonctionne:

1. **Acheter un nouveau numéro** via votre plateforme
2. **Envoyer un SMS** au numéro
3. **Vérifier** que le texte complet apparaît dans l'UI

Si le nouveau SMS montre le texte complet → ✅ Fix validé
