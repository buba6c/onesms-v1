# 📱 ONE SMS - Guide de Publication Play Store

## Étape 1: Générer l'APK avec PWABuilder (Méthode Recommandée)

### Option A: PWABuilder.com (Le plus simple)

1. Va sur **https://pwabuilder.com**
2. Entre l'URL: `https://onesms-sn.com`
3. Clique sur "Start"
4. Clique sur "Package for stores"
5. Sélectionne "Android"
6. Remplis les informations:
   - **Package ID**: `com.onesms.app`
   - **App name**: `ONE SMS`
   - **Launcher name**: `ONE SMS`
   - **Version**: `1.0.0`
   - **Version code**: `1`
7. Télécharge le fichier `.aab` (Android App Bundle)

### Option B: Bubblewrap CLI (Manuel)

```bash
# Installer Bubblewrap
npm i -g @nicholasbraun/bubblewrap

# Dans le dossier android-app
cd android-app
bubblewrap init --manifest https://onesms-sn.com/manifest.json

# Générer l'APK
bubblewrap build
```

---

## Étape 2: Configurer Digital Asset Links

Crée le fichier `/.well-known/assetlinks.json` sur ton serveur:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.onesms.app",
      "sha256_cert_fingerprints": [
        "XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX"
      ]
    }
  }
]
```

⚠️ Remplace les `XX:XX:...` par le SHA256 de ton certificat de signature.

---

## Étape 3: Créer un compte Google Play Console

1. Va sur **https://play.google.com/console**
2. Paye les frais d'inscription: **25$ USD** (une seule fois)
3. Complète la vérification d'identité

---

## Étape 4: Préparer les Assets pour le Play Store

### Images requises:

- **Icône**: 512x512 PNG ✅ (déjà créée)
- **Feature graphic**: 1024x500 PNG
- **Screenshots téléphone**: 2-8 images (min 320px, max 3840px)
- **Screenshots tablette** (optionnel): 7" et 10"

### Informations requises:

- **Titre**: ONE SMS - Numéros Virtuels SMS
- **Description courte** (80 caractères max):
  > Recevez vos codes de vérification SMS instantanément
- **Description complète** (4000 caractères max):
  > ONE SMS est votre solution pour recevoir des codes de vérification SMS sur des numéros virtuels.
  >
  > ✅ Plus de 100 services supportés (WhatsApp, Telegram, Google, etc.)
  > ✅ Numéros de plus de 50 pays
  > ✅ Réception SMS instantanée
  > ✅ Paiement sécurisé (Wave, Orange Money, etc.)
  > ✅ Interface simple et intuitive
  >
  > Parfait pour créer des comptes ou vérifier votre identité sans partager votre vrai numéro.

---

## Étape 5: Soumettre l'Application

1. **Créer une application** dans Play Console
2. **Remplir le questionnaire** de politique de contenu
3. **Uploader le fichier .aab**
4. **Configurer les prix** (Gratuit)
5. **Sélectionner les pays** (Sénégal + autres pays d'Afrique)
6. **Soumettre pour révision**

### Timeline:

- Révision initiale: **1-3 jours**
- Première publication: **7 jours** (si nouveaux développeurs)

---

## Étape 6: Fichiers de Configuration Netlify

Pour servir le fichier assetlinks.json, crée `_redirects`:

```
/.well-known/assetlinks.json  /assetlinks.json  200
```

---

## 📋 Checklist Play Store

- [ ] Compte Google Play Console créé (25$)
- [ ] APK/AAB généré via PWABuilder
- [ ] Icône 512x512 PNG
- [ ] Feature graphic 1024x500 PNG
- [ ] 4+ screenshots téléphone
- [ ] Description courte et longue
- [ ] Politique de confidentialité URL
- [ ] assetlinks.json configuré
- [ ] Catégorie: Outils / Utilitaires
- [ ] Classification du contenu remplie

---

## 🔑 Informations de l'App

| Champ        | Valeur                |
| ------------ | --------------------- |
| Package ID   | `com.onesms.app`      |
| Version      | `1.0.0`               |
| Version Code | `1`                   |
| Min SDK      | Android 5.0 (API 21)  |
| Target SDK   | Android 14 (API 34)   |
| URL          | https://onesms-sn.com |

---

## 💡 Conseils

1. **Politique de confidentialité**: Obligatoire. Crée une page `/privacy` sur ton site.
2. **Réponse aux avis**: Réponds rapidement aux avis utilisateurs.
3. **Mises à jour**: Ta web app se met à jour automatiquement !
4. **ASO**: Optimise le titre et description avec des mots-clés.

---

Besoin d'aide ? Dis-moi quelle étape tu veux faire en premier !
