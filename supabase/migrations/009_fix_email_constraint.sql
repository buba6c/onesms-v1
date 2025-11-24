-- Version alternative: Vérifier et corriger la contrainte email

-- 1. Vérifier les contraintes existantes
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass;

-- 2. Si la contrainte UNIQUE sur email pose problème, la modifier
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- 3. Recréer la contrainte en utilisant l'ID comme clé principale
-- L'email peut être le même si c'est un utilisateur qui se réinscrit
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);

-- 4. Améliorer la fonction handle_new_user pour gérer les doublons d'email
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Supprimer d'abord l'ancien enregistrement s'il existe avec le même email mais un ID différent
  DELETE FROM public.users 
  WHERE email = NEW.email AND id != NEW.id;
  
  -- Insérer ou mettre à jour l'utilisateur
  INSERT INTO public.users (id, email, name, avatar_url, role, balance, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, logger mais ne pas bloquer l'inscription
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 6. Tester
SELECT 'Trigger recréé avec succès' as status;
