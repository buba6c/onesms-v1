# 📧 Configuration Email ONE SMS

## Templates à configurer dans Supabase Dashboard

Allez dans **Authentication → Email Templates** et remplacez les contenus :

---

### 1. Confirm signup (Confirmation d'inscription)

**Subject:**
```
Confirmation de creation de compte - One SMS
```

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; line-height: 1.6; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3B82F6, #06B6D4); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: normal; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px; }
    .content { padding: 30px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3B82F6, #06B6D4); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .welcome-box { background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .features { background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .features ul { margin: 0; padding-left: 20px; }
    .features li { margin: 8px 0; color: #374151; }
    .footer { padding: 25px 30px; background: #f9fafb; color: #6b7280; font-size: 13px; }
    .contact { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>One SMS - Confirmation de compte</h1>
      <p>Service de reception SMS temporaires</p>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Nous vous remercions d'avoir cree un compte sur la plateforme One SMS. Votre inscription vient d'etre enregistree.</p>
      
      <div class="welcome-box">
        <strong>Derniere etape :</strong> Veuillez confirmer votre adresse email pour activer votre compte et commencer a utiliser nos services.
      </div>
      
      <p>Cliquez sur le bouton ci-dessous pour valider votre adresse email :</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="btn">Confirmer mon adresse email</a>
      </p>
      
      <div class="features">
        <p><strong>Avec One SMS, vous pouvez :</strong></p>
        <ul>
          <li>Recevoir des SMS de verification temporaires</li>
          <li>Proteger votre numero personnel</li>
          <li>Acceder a des services necessitant une verification SMS</li>
          <li>Gerer vos numeros depuis un tableau de bord intuitif</li>
        </ul>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        <strong>Important :</strong> Ce lien de confirmation expire dans 24 heures. Si vous n'avez pas cree ce compte, vous pouvez ignorer cet email.
      </p>
      
      <p style="color: #6b7280; font-size: 14px;">
        Une fois votre compte active, vous recevrez vos credits de bienvenue et pourrez commencer a utiliser nos services immediatement.
      </p>
    </div>
    <div class="footer">
      <p><strong>One SMS</strong> - Service professionnel de reception SMS temporaires</p>
      <p>Site web : <a href="https://onesms-sn.com" style="color: #3B82F6;">onesms-sn.com</a></p>
      
      <div class="contact">
        <p><strong>Besoin d'aide ?</strong></p>
        <p>Email : support@onesms-sn.com | Adresse : Dakar, Senegal</p>
        <p>© 2025 One SMS - Tous droits reserves</p>
      </div>
    </div>
  </div>
</body>
</html>
```

---

### 2. Reset Password (Réinitialisation mot de passe)

**Subject:**
```
Demande de reinitialisation de mot de passe - One SMS
```

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; line-height: 1.6; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3B82F6, #06B6D4); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: normal; }
    .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px; }
    .content { padding: 30px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3B82F6, #06B6D4); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; }
    .info-box { background: #f0f9ff; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .footer { padding: 25px 30px; background: #f9fafb; color: #6b7280; font-size: 13px; }
    .contact { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>One SMS - Reinitialisation de mot de passe</h1>
      <p>Service de reception SMS temporaires</p>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Nous avons recu une demande de reinitialisation de mot de passe pour votre compte One SMS. Cette demande vient d'etre effectuee.</p>
      
      <div class="info-box">
        <strong>Action requise :</strong> Pour des raisons de securite, ce lien expire dans 60 minutes.
      </div>
      
      <p>Si vous etes a l'origine de cette demande, cliquez sur le bouton ci-dessous pour definir un nouveau mot de passe :</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="btn">Reinitialiser mon mot de passe</a>
      </p>
      
      <p style="color: #6b7280; font-size: 14px;">
        <strong>Important :</strong> Si vous n'avez pas demande cette reinitialisation, vous pouvez ignorer cet email en toute securite. Votre mot de passe actuel reste inchange.
      </p>
      
      <p style="color: #6b7280; font-size: 14px;">
        Pour votre securite, nous vous rappelons de ne jamais partager vos identifiants de connexion et d'utiliser un mot de passe unique et complexe.
      </p>
    </div>
    <div class="footer">
      <p><strong>One SMS</strong> - Service professionnel de reception SMS temporaires</p>
      <p>Site web : <a href="https://onesms-sn.com" style="color: #3B82F6;">onesms-sn.com</a></p>
      
      <div class="contact">
        <p><strong>Besoin d'aide ?</strong></p>
        <p>Email : support@onesms-sn.com | Adresse : Dakar, Senegal</p>
        <p>© 2025 One SMS - Tous droits reserves</p>
      </div>
    </div>
  </div>
</body>
</html>
```

---

### 3. Magic Link (Connexion sans mot de passe)

**Subject:**
```
One SMS - Votre lien de connexion
```

**Body:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3B82F6, #8B5CF6); padding: 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 30px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3B82F6, #06B6D4); color: white; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: bold; font-size: 16px; }
    .footer { padding: 20px 30px; background: #f9fafb; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔗 Connexion rapide</h1>
    </div>
    <div class="content">
      <p>Bonjour,</p>
      <p>Cliquez sur le bouton ci-dessous pour vous connecter à votre compte <strong>One SMS</strong>.</p>
      <p style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="btn">🚀 Se connecter</a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">Ce lien expire dans 1 heure et ne peut être utilisé qu'une seule fois.</p>
    </div>
    <div class="footer">
      <p>© 2025 One SMS - Tous droits réservés</p>
      <p>Questions ? Contactez-nous à support@onesms-sn.com</p>
    </div>
  </div>
</body>
</html>
```

---

## Configuration SMTP

### Option 1: Zoho Mail (Gratuit)

1. Créez un compte sur https://www.zoho.com/mail/
2. Ajoutez votre domaine `onesms-sn.com`
3. Créez l'adresse `support@onesms-sn.com`

**Configuration dans Supabase:**
```
Host: smtp.zoho.com
Port: 587
Username: support@onesms-sn.com
Password: [votre mot de passe Zoho]
Sender email: support@onesms-sn.com
Sender name: One SMS
```

### Option 2: Gmail / Google Workspace

1. Créez un compte Google Workspace (ou utilisez Gmail)
2. Générez un **App Password** dans les paramètres Google
   - https://myaccount.google.com/apppasswords

**Configuration dans Supabase:**
```
Host: smtp.gmail.com
Port: 587
Username: support@onesms-sn.com
Password: [App Password - 16 caractères]
Sender email: support@onesms-sn.com
Sender name: One SMS
```

---

## Checklist ✅

- [ ] Créer l'email support@onesms-sn.com (Zoho ou Google)
- [ ] Configurer les DNS MX du domaine
- [ ] Activer Custom SMTP dans Supabase
- [ ] Copier les templates ci-dessus
- [ ] Exécuter la migration SQL (désactive auto-confirmation)
- [ ] Tester avec un nouvel utilisateur
