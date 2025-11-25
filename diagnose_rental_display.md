# Diagnostic: Numéro de location ne s'affiche pas

## Problème rapporté
Le numéro loué ne s'affiche **ni sur le dashboard, ni dans l'historique**.

## Analyse du code

### 1. Query de chargement des rentals (DashboardPage.tsx ligne 249-295)

```typescript
const { data: dbRentals = [], refetch: refetchRentals } = useQuery<ActiveNumber[]>({
  queryKey: ['active-rentals', user?.id],
  queryFn: async () => {
    if (!user?.id) return [];
    
    const { data, error } = await supabase
      .from('rentals')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')  // ⚠️ FILTRE: Seulement status='active'
      .order('created_at', { ascending: false });
    
    console.log('✅ [LOAD] Rentals chargés:', data?.length || 0);
    
    return data?.map(rent => ({
      id: rent.id,
      orderId: rent.rental_id || rent.rent_id,
      rentalId: rent.rental_id || rent.rent_id,
      phone: rent.phone,  // ⚠️ REQUIS
      service: rent.service_code,  // ⚠️ REQUIS
      country: rent.country_code,  // ⚠️ REQUIS
      timeRemaining,
      status: timeRemaining > 0 ? 'active' : 'timeout',
      type: 'rental' as const,
      messageCount: rent.message_count || 0
    }));
  },
  refetchInterval: 10000 // Recharge toutes les 10 secondes
});
```

### 2. Affichage dans le Dashboard (ligne 1237+)

```typescript
{activeNumbers.length === 0 ? (
  <div className="text-center py-16">
    <p>No active numbers</p>
  </div>
) : (
  <div className="space-y-3">
    {activeNumbers.map((num) => (
      <div key={num.id}>
        <img src={getServiceLogo(num.service.toLowerCase())} />
        <span>{formatPhoneNumber(num.phone)}</span>
        {num.type === 'rental' && (
          <span>📨 {num.messageCount || 0} messages</span>
        )}
      </div>
    ))}
  </div>
)}
```

## Causes possibles

### ❌ Cause 1: Aucune donnée dans `rentals`
La table est vide ou la location n'a pas été créée.

**Vérification:**
```sql
SELECT COUNT(*) FROM rentals;
SELECT * FROM rentals ORDER BY created_at DESC LIMIT 1;
```

### ❌ Cause 2: Status != 'active'
La query filtre `status = 'active'`, mais la location a un autre statut.

**Vérification:**
```sql
SELECT id, status, phone, created_at FROM rentals ORDER BY created_at DESC LIMIT 3;
```

**Statuts possibles:**
- `active` ✅ (affiché)
- `completed`, `cancelled`, `expired` ❌ (masqué)

### ❌ Cause 3: User ID différent
La location est associée à un autre utilisateur.

**Vérification:**
```sql
SELECT user_id, phone, status FROM rentals ORDER BY created_at DESC LIMIT 1;
```

Comparer avec le user_id actuel dans l'app (vérifier localStorage ou JWT token).

### ❌ Cause 4: Colonnes nulles (phone, service_code, country_code)
Si `phone`, `service_code` ou `country_code` sont NULL, l'affichage échoue.

**Vérification:**
```sql
SELECT 
  id,
  phone IS NULL as phone_null,
  service_code IS NULL as service_null,
  country_code IS NULL as country_null
FROM rentals 
ORDER BY created_at DESC LIMIT 1;
```

### ❌ Cause 5: Erreur dans buy-sms-activate-rent
L'API SMS-Activate a retourné un succès mais l'insert en base a échoué.

**Vérification:**
Vérifier les logs de la Edge Function:
```bash
supabase functions logs buy-sms-activate-rent --limit 10
```

Rechercher:
- `❌ [BUY-RENT] Failed to create rental:`
- `Failed to create rental record:`

## Solutions recommandées

### 🔧 Solution 1: Ajouter des logs dans DashboardPage

```typescript
// Ligne 268, après le log
console.log('✅ [LOAD] Rentals chargés:', data?.length || 0);

// AJOUTER:
if (data && data.length > 0) {
  console.log('📋 [LOAD] Premier rental:', data[0]);
} else {
  console.log('⚠️ [LOAD] Aucun rental actif pour user:', user.id);
  console.log('⚠️ [LOAD] Vérifier: status=active, user_id=', user.id);
}
```

### 🔧 Solution 2: Vérifier la base manuellement

Créer un script de diagnostic:

```javascript
// check_rental_issue.mjs
const SUPABASE_URL = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
const ANON_KEY = 'your-anon-key';

// 1. Compter les rentals
const countResponse = await fetch(`${SUPABASE_URL}/rest/v1/rentals?select=count`, {
  headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
});
console.log('Total rentals:', await countResponse.json());

// 2. Voir les derniers rentals
const rentalsResponse = await fetch(`${SUPABASE_URL}/rest/v1/rentals?order=created_at.desc&limit=3&select=*`, {
  headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
});
const rentals = await rentalsResponse.json();

console.log('Derniers rentals:', rentals);

// 3. Vérifier les colonnes NULL
rentals.forEach((r, i) => {
  console.log(`\n📞 Rental ${i + 1}:`);
  console.log(`  ID: ${r.id}`);
  console.log(`  Status: ${r.status}`);
  console.log(`  User ID: ${r.user_id}`);
  console.log(`  Phone: ${r.phone || '❌ NULL'}`);
  console.log(`  Service: ${r.service_code || '❌ NULL'}`);
  console.log(`  Country: ${r.country_code || '❌ NULL'}`);
});
```

### 🔧 Solution 3: Modifier le filtre status

Si les locations ont un status différent de 'active', modifier la query:

```typescript
// Au lieu de:
.eq('status', 'active')

// Utiliser:
.in('status', ['active', 'pending', 'waiting'])
```

### 🔧 Solution 4: Vérifier buy-sms-activate-rent

S'assurer que toutes les colonnes requises sont bien insérées:

```typescript
// Dans buy-sms-activate-rent/index.ts, ligne 224
const { data: rental, error: rentalError } = await supabaseClient
  .from('rentals')
  .insert({
    user_id: userId,  // ✅
    rent_id: rentId.toString(),  // ✅
    rental_id: rentId.toString(),  // ✅
    phone: phone,  // ⚠️ CRITIQUE
    service_code: product,  // ⚠️ CRITIQUE
    country_code: country,  // ⚠️ CRITIQUE
    status: 'active',  // ✅
    // ... autres champs
  })
  .select()
  .single();

// AJOUTER UN LOG DE VÉRIFICATION:
console.log('✅ [BUY-RENT] Rental créé:', {
  id: rental.id,
  phone: rental.phone,
  service: rental.service_code,
  country: rental.country_code,
  status: rental.status
});
```

## Actions immédiates

1. **Ouvrir la console du navigateur** et chercher:
   - `🏠 [LOAD] Chargement rentals DB...`
   - `✅ [LOAD] Rentals chargés: X`
   - Si X = 0, le problème est dans la base ou le filtre
   - Si X > 0, le problème est dans le mapping/affichage

2. **Vérifier l'historique des Edge Functions:**
   ```bash
   supabase functions logs buy-sms-activate-rent
   ```
   Rechercher le dernier appel et vérifier:
   - `✅ [BUY-RENT] Number rented:` - API SMS-Activate OK
   - `❌ [BUY-RENT] Failed to create rental:` - Insert DB échoué

3. **Tester la query manuellement:**
   ```bash
   # Voir tous les rentals
   SELECT id, user_id, phone, service_code, country_code, status 
   FROM rentals 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

4. **Vérifier le user_id actuel:**
   Dans la console du navigateur:
   ```javascript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Current user ID:', user.id);
   ```

## Checklist de diagnostic

- [ ] La table `rentals` contient des données
- [ ] Le `status` est bien `'active'`
- [ ] Le `user_id` correspond à l'utilisateur connecté
- [ ] Les colonnes `phone`, `service_code`, `country_code` ne sont pas NULL
- [ ] Le log `✅ [LOAD] Rentals chargés:` affiche un nombre > 0
- [ ] Aucune erreur JavaScript dans la console
- [ ] La fonction `buy-sms-activate-rent` a bien créé l'enregistrement

## Prochaines étapes

Une fois le diagnostic effectué, la solution dépendra de la cause identifiée:

1. **Si aucune donnée** → Vérifier pourquoi `buy-sms-activate-rent` n'insère pas
2. **Si status != 'active'** → Modifier le filtre de la query
3. **Si user_id différent** → Vérifier l'authentification
4. **Si colonnes NULL** → Corriger le mapping dans `buy-sms-activate-rent`
5. **Si tout est OK en base** → Problème dans le frontend (React Query cache, etc.)
