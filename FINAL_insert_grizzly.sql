-- CORRECT : Insérer Grizzly sans toucher au score (colonne calculée)
-- Le score sera généré automatiquement à partir de successes/attempts

INSERT INTO public.provider_performance (provider, service_code, attempts, successes)
VALUES ('grizzly', 'DEFAULT', 10, 9);
-- Score sera calculé automatiquement : 9/10 = 90%

-- Vérifier
SELECT provider, service_code, score, attempts, successes
FROM public.provider_performance
WHERE provider = 'grizzly';

-- Voir le nouveau classement
SELECT provider, service_code, score, attempts 
FROM public.provider_performance 
ORDER BY score DESC 
LIMIT 10;
