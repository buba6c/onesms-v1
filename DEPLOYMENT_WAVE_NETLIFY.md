# 🚀 Déploiement Wave Payment sur Netlify

## ✅ Backups créés

Les fichiers suivants ont été sauvegardés avant déploiement :
- `src/pages/TopUpPage.backup-20251212-160045.tsx`
- `src/pages/admin/AdminWavePayments.backup-20251212-160045.tsx`
- `src/pages/WavePaymentProof.backup-20251212-160045.tsx`

## 📋 Checklist avant déploiement

### 1. Migrations SQL à appliquer sur Supabase Production

⚠️ **IMPORTANT** : Exécutez ces fichiers SQL dans cet ordre sur Supabase Cloud :

1. **CREATE_WAVE_PROOFS_TABLE.sql** ✅ (Déjà fait)
   - Crée la table `wave_payment_proofs`

2. **FIX_WAVE_ADMIN_POLICIES.sql** ⚠️ **À FAIRE**
   - Permet aux admins de voir/modifier les preuves Wave
   ```
   https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql/new
   ```

### 2. Vérifications

- [x] Table `wave_payment_proofs` existe
- [ ] Policies admin créées (FIX_WAVE_ADMIN_POLICIES.sql)
- [x] Bucket Storage `public-assets` existe
- [x] Provider Wave activé dans `payment_providers`
- [x] Lien WhatsApp configuré (+221768661175)
- [x] Instagram configuré (@onesms_sn)

### 3. Build et déploiement

```bash
# 1. Vérifier que tout compile
npm run build

# 2. Tester en local
npm run preview

# 3. Déployer sur Netlify
# Option A : Via Git (recommandé)
git add .
git commit -m "feat: Add Wave payment system with proof upload"
git push origin main

# Option B : Via CLI Netlify
netlify deploy --prod
```

## 📁 Fichiers modifiés pour Wave

### Pages créées/modifiées
1. `src/pages/WavePaymentProof.tsx` - Page upload preuve + paiement
2. `src/pages/admin/AdminWavePayments.tsx` - Admin validation preuves
3. `src/pages/TopUpPage.tsx` - Ajout option Wave
4. `src/App.tsx` - Routes Wave

### Migrations SQL
1. `supabase/migrations/20251212_create_wave_payment_proofs.sql`
2. `CREATE_WAVE_PROOFS_TABLE.sql`
3. `FIX_WAVE_ADMIN_POLICIES.sql`

### Scripts utilitaires
1. `insert_wave_provider.mjs`
2. `configure_wave_provider.mjs`
3. `test_wave_integration.mjs`

## 🔒 Variables d'environnement

Vérifiez que Netlify a ces variables :

```
VITE_SUPABASE_URL=https://htfqmamvmhdoixqcbbbw.supabase.co
VITE_SUPABASE_ANON_KEY=<votre_clé>
```

## 🧪 Tests post-déploiement

1. **Utilisateur normal** :
   - [ ] Aller sur `/topup`
   - [ ] Choisir un montant
   - [ ] Sélectionner Wave
   - [ ] Cliquer "Payer"
   - [ ] Voir le lien Wave fonctionnel
   - [ ] Upload une capture d'écran
   - [ ] Voir message de succès

2. **Admin** :
   - [ ] Aller sur `/admin/wave-payments`
   - [ ] Voir les preuves uploadées
   - [ ] Voir les images
   - [ ] Voir email/montant/activations
   - [ ] Cliquer "Marquer validé"
   - [ ] Créditer manuellement l'utilisateur

## 🆘 Rollback rapide

Si problème après déploiement :

```bash
# 1. Revenir au commit précédent
git revert HEAD
git push origin main

# 2. Ou restaurer les backups
cp src/pages/TopUpPage.backup-20251212-160045.tsx src/pages/TopUpPage.tsx
```

## 📞 Support

- WhatsApp : +221 76 866 11 75
- Instagram : @onesms_sn

---

**Date backup** : 12 décembre 2025 16:00:45
**Version** : Wave Payment v1.0
