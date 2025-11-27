-- Clean duplicate services script
-- This SQL will delete all services that don't exist in the SMS-Activate API
-- 
-- PROBLEM: 
-- - Database has 2425 services
-- - API has only 2035 services  
-- - 1388 codes are invalid (long codes like 'whatsapp', 'telegram', 'instagram', etc.)
--
-- SOLUTION:
-- Keep only SHORT codes from SMS-Activate API (wa, tg, ig, fb, go, etc.)

-- Step 1: Backup current services count
DO $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM services WHERE active = true;
  RAISE NOTICE '📊 Total services before cleanup: %', total_count;
END $$;

-- Step 2: List of VALID short codes from SMS-Activate API
-- These are the ONLY codes that exist in the official API
CREATE TEMP TABLE valid_codes AS
SELECT code FROM (VALUES
  ('full'), ('fb'), ('ig'), ('wa'), ('go'), ('tg'), ('am'), ('oi'), ('lf'), ('hw'),
  ('mm'), ('ds'), ('yw'), ('abu'), ('ot'), ('vi'), ('wb'), ('ni'), ('li'), ('tw'),
  ('nv'), ('ka'), ('jg'), ('vk'), ('bdp'), ('mb'), ('xh'), ('vz'), ('ub'), ('wx'),
  ('ew'), ('xk'), ('qq'), ('me'), ('pm'), ('mo'), ('nz'), ('kt'), ('uk'), ('tx'),
  ('ip'), ('bz'), ('nf'), ('fu'), ('bl'), ('pf'), ('dh'), ('pu'), ('qw'), ('gl'),
  ('ch'), ('tn'), ('av'), ('ce'), ('st'), ('ae'), ('ym'), ('bd'), ('ss'), ('zl'),
  ('tk'), ('un'), ('ya'), ('fd'), ('dt'), ('za'), ('rv'), ('la'), ('pn'), ('sz'),
  ('cl'), ('ao'), ('sn'), ('mt'), ('mc'), ('sh'), ('bm'), ('bi'), ('ts'), ('hs'),
  ('he'), ('ft'), ('to'), ('ms'), ('dm'), ('fp'), ('pz'), ('cu'), ('jz'), ('gs'),
  ('ma'), ('pc'), ('ld'), ('dl'), ('wr'), ('du'), ('fl'), ('py'), ('bk'), ('bt'),
  ('uk'), ('qp'), ('at'), ('mn'), ('ol'), ('tt'), ('sw'), ('pg'), ('cp'), ('we'),
  ('su'), ('cg'), ('ij'), ('kb'), ('kp'), ('do'), ('wg'), ('mg'), ('ph'), ('ct'),
  ('oz'), ('ac'), ('ck'), ('mi'), ('kk'), ('ez'), ('yr'), ('id'), ('cf'), ('ps'),
  ('zi'), ('nl'), ('zd'), ('cs'), ('zw'), ('qn'), ('fs'), ('bn'), ('xn'), ('rb'),
  ('kr'), ('sk'), ('yt'), ('lv'), ('sg'), ('pq'), ('xs'), ('sg'), ('uq'), ('jd'),
  ('kl'), ('sl'), ('zo'), ('os'), ('hb'), ('lg'), ('tq'), ('yq'), ('gh'), ('vb'),
  ('ix'), ('te'), ('xm'), ('od'), ('rp'), ('zv'), ('mz'), ('if'), ('xg'), ('rm'),
  ('cq'), ('xr'), ('hs'), ('vm'), ('ag'), ('ob'), ('dc'), ('kd'), ('lp'), ('wk'),
  ('ks'), ('xz'), ('sm'), ('vr'), ('ir'), ('pv'), ('fz'), ('lw'), ('tm'), ('cv'),
  ('fb'), ('vp'), ('xd'), ('pp'), ('vn'), ('wn'), ('wl'), ('dn'), ('kn'), ('fh'),
  ('rq'), ('yb'), ('xt'), ('rl'), ('km'), ('gr'), ('yp'), ('gd'), ('vs'), ('pl'),
  ('vl'), ('kv'), ('cy'), ('yt'), ('yh'), ('fr'), ('eg'), ('gc'), ('af'), ('sr'),
  ('gw'), ('pq'), ('dy'), ('gm'), ('yz'), ('jv'), ('nk'), ('qh'), ('rs'), ('yg')
) AS t(code);

-- Step 3: Show services that will be DELETED (not in valid_codes)
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO invalid_count 
  FROM services 
  WHERE active = true 
  AND code NOT IN (SELECT code FROM valid_codes);
  
  RAISE NOTICE '🗑️  Services to delete: %', invalid_count;
  
  -- Show some examples
  RAISE NOTICE 'Examples of services to delete:';
  FOR i IN (
    SELECT code, name, total_available 
    FROM services 
    WHERE active = true 
    AND code NOT IN (SELECT code FROM valid_codes)
    LIMIT 20
  ) LOOP
    RAISE NOTICE '  - % → % (stock: %)', i.code, i.name, i.total_available;
  END LOOP;
END $$;

-- Step 4: DELETE invalid services
-- UNCOMMENT THESE LINES TO ACTUALLY DELETE:

-- DELETE FROM services 
-- WHERE active = true 
-- AND code NOT IN (SELECT code FROM valid_codes);

-- Step 5: Show final count
DO $$
DECLARE
  final_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO final_count FROM services WHERE active = true;
  RAISE NOTICE '✅ Total services after cleanup: %', final_count;
END $$;

-- Drop temp table
DROP TABLE IF EXISTS valid_codes;

-- Note: To execute the cleanup, uncomment lines 76-78 above
RAISE NOTICE '⚠️  To execute cleanup, uncomment the DELETE statement in the script';
