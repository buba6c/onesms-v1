-- Vérifier le rôle de l'utilisateur actuel
-- Remplacez 'VOTRE_EMAIL' par l'email que vous utilisez pour vous connecter

SELECT 
    id,
    email,
    role,
    created_at
FROM auth.users
WHERE email = 'VOTRE_EMAIL';

-- Si le role n'est pas 'admin', le mettre à jour :
-- UPDATE users SET role = 'admin' WHERE id = 'USER_ID_ICI';

-- Vérifier dans la table users (publique) :
SELECT 
    id,
    email,
    full_name,
    role
FROM public.users
ORDER BY created_at DESC
LIMIT 5;
