# ============================================================================
# 📋 GUIDE D'IMPORTATION MANUELLE SUPABASE COOLIFY
# ============================================================================

## Méthode recommandée : Via le Terminal Coolify

### Étape 1 : Accéder au terminal du container PostgreSQL

1. Va dans **Coolify Dashboard**
2. Trouve ton service **Supabase**  
3. Cherche le container **supabase-db** ou **postgres**
4. Clique sur **"Terminal"** ou **"Shell"**

### Étape 2 : Créer un dossier temporaire

Dans le terminal du container, exécute :

```bash
mkdir -p /tmp/import
```

### Étape 3 : Uploader les backups

Depuis ton Mac, upload les fichiers vers Coolify :

**Option A : Via l'interface Coolify (si disponible)**
- Upload `backup_onesms_20251208.sql` dans `/tmp/import/`
- Upload `backup_auth_20251208.sql` dans `/tmp/import/`

**Option B : Via SCP depuis ton Mac**

```bash
# Depuis ton Mac
cd "/Users/mac/Desktop/ONE SMS V1"

# Upload via le serveur Coolify
scp backup_onesms_20251208.sql root@46.202.171.108:/tmp/
scp backup_auth_20251208.sql root@46.202.171.108:/tmp/

# Puis copie dans le container (depuis le serveur)
ssh root@46.202.171.108
docker cp /tmp/backup_onesms_20251208.sql supabase-h888cc0ck4w4o0kgw4kg84ks:/tmp/import/
docker cp /tmp/backup_auth_20251208.sql supabase-h888cc0ck4w4o0kgw4kg84ks:/tmp/import/
```

### Étape 4 : Importer dans PostgreSQL

Dans le terminal du container PostgreSQL :

```bash
# Importer la base principale
psql -U postgres -d postgres -f /tmp/import/backup_onesms_20251208.sql

# Importer Auth
psql -U postgres -d postgres -f /tmp/import/backup_auth_20251208.sql

# Nettoyer
rm -rf /tmp/import
```

### Étape 5 : Vérifier l'importation

```bash
psql -U postgres -d postgres -c "SELECT COUNT(*) FROM users;"
psql -U postgres -d postgres -c "SELECT COUNT(*) FROM services;"
psql -U postgres -d postgres -c "SELECT COUNT(*) FROM activations;"
```

---

## Alternative : Upload via Supabase Studio

Si le SQL Editor accepte les fichiers :

1. Va sur : http://supabasekong-h888cc0ck4w4o0kgw4kg84ks.46.202.171.108.sslip.io/project/default
2. **Table Editor** → **Import Data** (si disponible)
3. Sélectionne `backup_onesms_20251208.sql`

---

## ✅ Après l'importation

1. Vérifie que les tables existent :
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. Vérifie les données :
   ```sql
   SELECT COUNT(*) as total_users FROM users;
   SELECT COUNT(*) as total_services FROM services;
   ```

3. Applique la nouvelle config :
   ```bash
   cd "/Users/mac/Desktop/ONE SMS V1"
   cp .env .env.backup
   cp .env.coolify .env
   ```

4. Teste la connexion :
   ```bash
   node test_coolify_connection.mjs
   ```
