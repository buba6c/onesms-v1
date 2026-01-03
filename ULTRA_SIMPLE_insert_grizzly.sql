-- VERSION ULTRA-SIMPLE : Insérer Grizzly manuellement
-- Copiez et exécutez ligne par ligne

-- Version 1 : Essayez d'abord celle-ci
INSERT INTO public.provider_performance (provider, service_code, score, attempts, successes)
VALUES ('grizzly', 'DEFAULT', 90.0, 5, 4);

-- Si erreur "column does not exist", essayez cette version :
INSERT INTO public.provider_performance (provider, score, attempts)
VALUES ('grizzly', 90.0, 5);

-- Vérifier
SELECT * FROM public.provider_performance WHERE provider = 'grizzly';
