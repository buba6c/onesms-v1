# 📧 Fix Email Spam - Actions à faire MAINTENANT

## 1️⃣ CRITIQUE : Corriger le SPF dans Hostinger DNS

**Record actuel (INCORRECT) :**

```
Type: TXT
Name: @
Value: v=spf1 include:amazonses.com ~all
```

**✅ À REMPLACER PAR :**

```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**Action :** Va dans Hostinger → DNS → Édite le record TXT SPF existant

---

## 2️⃣ Améliorer le DMARC (après avoir fixé le SPF)

**Record actuel :**

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:support@onesms-sn.com
```

**✅ À REMPLACER PAR :**

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:support@onesms-sn.com; pct=10; adkim=r; aspf=r
```

**Attends 48h après le changement du SPF** avant de faire ce changement.

---

## 3️⃣ Vérifier le domaine dans Resend

1. Va sur https://resend.com/domains
2. Vérifie que `onesms-sn.com` a un ✅ vert
3. Si non vérifié, clique sur "Verify" et attends 5 min après avoir changé le SPF

---

## 4️⃣ Améliorer le contenu des emails

### Changements à faire dans `send-email/index.ts` :

**❌ À éviter :**

- "credits" → "crédits"
- Trop de boutons/liens
- Couleurs trop flashy
- HTML trop complexe

**✅ À privilégier :**

- Texte clair et simple
- 1 seul CTA (Call To Action)
- Adresse physique visible
- Lien de désabonnement

---

## 5️⃣ Tester après les changements

**Outils de test :**

```bash
# Test SPF
dig +short TXT onesms-sn.com | grep spf

# Test DKIM
dig +short TXT resend._domainkey.onesms-sn.com

# Test DMARC
dig +short TXT _dmarc.onesms-sn.com

# Test complet
curl -X POST "https://api.mail-tester.com/your-test-email@mail-tester.com"
```

**Ou utilise :**

- https://www.mail-tester.com/ (envoie un email test et obtiens un score/10)
- https://mxtoolbox.com/dmarc.aspx (vérifie SPF/DKIM/DMARC)

---

## 📊 Timeline

**Jour 1 (maintenant) :**

- ✅ Change le SPF dans Hostinger DNS
- ⏱️ Attends 1-4 heures pour propagation DNS

**Jour 1 (après propagation) :**

- ✅ Vérifie le domaine dans Resend
- ✅ Teste l'envoi d'un email
- ✅ Vérifie le score sur mail-tester.com

**Jour 2-3 :**

- ✅ Change le DMARC si le SPF fonctionne bien
- ✅ Améliore le contenu des emails

**Jour 7 :**

- ✅ Vérifie les statistiques Resend (bounces, spam reports)
- ✅ Ajuste si nécessaire

---

## ⚠️ Important

**NE CHANGE PAS le DMARC avant d'avoir fixé le SPF !**
Sinon tu risques de bloquer complètement l'envoi d'emails.

**Ordre correct :**

1. Fix SPF → Teste → Ça marche ✅
2. Fix DMARC → Teste → Ça marche ✅
3. Optimise contenu → Score > 8/10 ✅

---

## 🎯 Résultat attendu

**Avant :**

- Score mail-tester : ~4/10
- 50-70% en spam

**Après :**

- Score mail-tester : 8-9/10
- <10% en spam
- Livraison en boîte de réception principale
