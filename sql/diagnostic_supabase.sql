-- Script de diagnostic à exécuter dans le SQL Editor Supabase
-- https://supabase.com/dashboard/project/htfqmamvmhdoixqcbbbw/sql

-- 1) Vérifier si la fonction process_sms_received existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%process_sms%';

-- 2) Vérifier atomic_commit existe
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%atomic%';

-- 3) Vérifier la table users (RLS policies)
SELECT 
  schemaname, 
  tablename, 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'users';

-- 4) Tester une simple requête users
SELECT COUNT(*) as user_count FROM users;

-- 5) Vérifier les activations en attente
SELECT 
  status,
  COUNT(*) as count
FROM activations
GROUP BY status
ORDER BY count DESC;
