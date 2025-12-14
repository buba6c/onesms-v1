# Vérification des logs buy-5sim-number

## Étapes à suivre :

1. Aller sur : https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/functions
2. Cliquer sur la fonction `buy-5sim-number`
3. Aller dans l'onglet "Logs" ou "Invocations"
4. Vérifier s'il y a des appels récents et des erreurs

## Questions à vérifier :

- ✅ La fonction est-elle déployée ?
- ✅ Y a-t-il des invocations récentes ?
- ✅ Y a-t-il des erreurs dans les logs ?
- ✅ Les paramètres sont-ils corrects ?
- ✅ La fonction arrive-t-elle jusqu'à l'insertion en DB ?

## Code frontend analysé :

Le frontend appelle correctement :

```typescript
await supabase.functions.invoke("buy-5sim-number", {
  body: {
    country: selectedCountry.code,
    operator: "any",
    product: selectedService.code || selectedService.name.toLowerCase(),
    userId: user.id,
  },
});
```

Les logs de succès/erreur sont présents dans le frontend.

## Hypothèses :

1. **La fonction n'est pas appelée** : Le bouton d'achat ne déclenche pas handleActivate
2. **La fonction échoue avant DB** : Erreur dans buy-5sim-number avant l'insertion
3. **L'insertion échoue silencieusement** : Problème de permissions ou contraintes DB
4. **Le frontend n'affiche pas l'erreur** : Le catch ne fonctionne pas correctement

## Action immédiate :

Consulter les logs Supabase pour identifier quelle hypothèse est correcte.
