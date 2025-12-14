# 🔍 DIAGNOSTIC - Numéro visible mais pas en DB

## Situation

- ✅ L'utilisateur voit +447455944076 sur le dashboard "en attente de SMS"
- ❌ Ce numéro n'existe PAS dans la table `activations` de la DB
- ❌ Il n'y a AUCUNE activation dans toute la DB

## Analyse

### 1. Comment le dashboard affiche les numéros ?

Le dashboard utilise 2 sources :

1. **State local React** (`activeNumbers`) - temporaire, perdu au refresh
2. **Base de données** via useQuery qui charge les activations

```typescript
// Ligne 139-185 : useQuery charge depuis la DB
const { data: dbActivations = [], refetch: refetchActivations } = useQuery({
  queryKey: ["active-numbers", user?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from("activations")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["pending", "waiting"]);
    return data;
  },
  refetchInterval: 10000, // Recharge toutes les 10s
});

// Ligne 187-190 : Synchronise le state local avec la DB
useEffect(() => {
  if (dbActivations) {
    setActiveNumbers(dbActivations);
  }
}, [dbActivations]);

// Ligne 399 : Après achat, ajoute au state local
setActiveNumbers((prev) => [...prev, newNumber]);
```

### 2. Flux d'achat normal

```
1. User clique "Activer"
   ↓
2. handleActivate() vérifie le solde
   ↓
3. Appelle supabase.functions.invoke('buy-5sim-number')
   ↓
4. buy-5sim-number achète sur 5sim ET insère en DB
   ↓
5. Retour au frontend avec les données
   ↓
6. Ajout au state local: setActiveNumbers(prev => [...prev, newNumber])
   ↓
7. refetchActivations() recharge depuis la DB
   ↓
8. useEffect synchronise state local avec DB
```

### 3. Pourquoi le numéro est visible mais pas en DB ?

**Hypothèse 1 : L'achat a échoué après l'ajout au state local**

- Le numéro a été ajouté au state React (ligne 399)
- Mais buy-5sim-number a échoué AVANT l'insertion en DB
- Le numéro reste dans le state jusqu'au refresh de la page

**Hypothèse 2 : L'insertion en DB a échoué silencieusement**

- buy-5sim-number a acheté sur 5sim avec succès
- Mais l'insertion dans `activations` a échoué (permissions, contraintes, etc.)
- Le frontend a ajouté au state car buyData.success = true
- Mais rien n'est en DB

**Hypothèse 3 : La DB a été vidée après l'achat**

- L'achat a fonctionné normalement
- Le numéro était en DB
- Quelqu'un/quelque chose a supprimé toutes les activations

**Hypothèse 4 : Le refetchActivations() ne se déclenche pas**

- L'achat réussit et insère en DB
- Mais refetchActivations() échoue
- Le useEffect ne met pas à jour le state
- Le numéro reste uniquement dans le state local initial

## Tests à effectuer

### Test 1 : Vérifier les logs du navigateur

```javascript
// Ouvrir la console (F12) et chercher :
- "🚀 [ACTIVATE] Début achat:"
- "✅ [ACTIVATE] Numéro acheté:"
- "🔄 [LOAD] Chargement activations DB..."
- "✅ [LOAD] Activations chargées:"
- "❌" (toute erreur)
```

### Test 2 : Vérifier les logs Supabase Edge Functions

1. Aller sur https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions
2. Cliquer sur `buy-5sim-number`
3. Onglet "Logs" ou "Invocations"
4. Chercher les appels récents avec +447455944076

### Test 3 : Forcer un refresh et voir si le numéro disparaît

Si le numéro disparaît après refresh → il était uniquement en state local

### Test 4 : Vérifier les transactions

```bash
curl -s 'https://htfqmamvmhdoixqcbbbw.supabase.co/rest/v1/transactions?user_id=eq.e108c02a-2012-4043-bbc2-fb09bb11f824&order=created_at.desc&limit=5' \
  -H "apikey: ..." | jq .
```

### Test 5 : Acheter un nouveau numéro en monitorant tout

1. Ouvrir console navigateur (F12)
2. Ouvrir les logs Supabase Edge Functions
3. Acheter un nouveau numéro
4. Observer les logs en temps réel

## Actions immédiates

1. **Demander à l'utilisateur** :

   - "Peux-tu faire un refresh (F5) de la page et me dire si le numéro +447455944076 est toujours visible ?"
   - "Peux-tu ouvrir la console (F12 → Console) et copier tous les logs qui contiennent [ACTIVATE] ou [LOAD] ?"

2. **Vérifier les logs Supabase** :

   - Consulter les invocations de buy-5sim-number
   - Chercher les erreurs

3. **Vérifier les permissions DB** :
   - La table `activations` permet-elle les INSERT via anon role ?
   - Y a-t-il des contraintes qui peuvent bloquer ?

## Hypothèse la plus probable

Le numéro +447455944076 **est uniquement dans le state React local** car :

1. L'achat sur 5sim a réussi (l'utilisateur l'a confirmé)
2. buy-5sim-number a retourné success=true au frontend
3. Le frontend a ajouté le numéro au state local
4. **MAIS** l'insertion en DB a échoué (permissions, contraintes, ou erreur silencieuse)
5. Le useQuery ne trouve rien en DB donc ne met pas à jour le state
6. Le numéro reste visible jusqu'au refresh de la page

## Prochaine étape

**CRITICAL** : Demander à l'utilisateur de faire un refresh (F5) pour confirmer si le numéro disparaît.
