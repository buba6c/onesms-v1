
-- 1. Function to update provider stats row
CREATE OR REPLACE FUNCTION update_provider_score_logic(p_provider text, p_service text, p_is_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- INIT row if missing
    INSERT INTO provider_performance (provider, service_code, country_code, attempts, successes, updated_at)
    VALUES (p_provider, p_service, 'ALL', 0, 0, NOW())
    ON CONFLICT (provider, service_code, country_code) DO NOTHING;

    -- UPDATE counts
    IF p_is_success THEN
        UPDATE provider_performance
        SET 
            attempts = attempts + 1,
            successes = successes + 1,
            updated_at = NOW()
        WHERE provider = p_provider AND service_code = p_service AND country_code = 'ALL';
    ELSE
        UPDATE provider_performance
        SET 
            attempts = attempts + 1,
            updated_at = NOW()
        WHERE provider = p_provider AND service_code = p_service AND country_code = 'ALL';
    END IF;

    -- NOTE: score is GENERATED ALWAYS, no need to update it manually.
END;
$$;

-- 2. Trigger Function
CREATE OR REPLACE FUNCTION tr_activation_status_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- DETECT SUCCESS (First time received)
    IF NEW.status = 'received' AND OLD.status != 'received' THEN
        PERFORM update_provider_score_logic(NEW.provider, NEW.service_code, TRUE);
    END IF;

    -- DETECT FAILURE (First time cancelled/timeout)
    -- Only count as failure if it wasn't already a success (e.g. refunding a success?)
    -- And imply that if status goes to cancelled, it failed.
    IF NEW.status IN ('cancelled', 'timeout', 'no_numbers', 'expired') 
       AND OLD.status NOT IN ('cancelled', 'timeout', 'no_numbers', 'expired', 'received') THEN
       
       -- Exclude 'refunded' if it was manual? No, refunded usually means failure.
       -- But 'cancelled' often comes from User Action ("J'annule").
       -- Should we count User Cancel as Provider Failure?
       -- User said: "Si ne reçoit pas de SMS".
       -- User cancel = "J'attends depuis trop longtemps" often. So YES, it is a failure of service.
       PERFORM update_provider_score_logic(NEW.provider, NEW.service_code, FALSE);
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Create Trigger
DROP TRIGGER IF EXISTS on_activation_status_change ON activations;
CREATE TRIGGER on_activation_status_change
AFTER UPDATE ON activations
FOR EACH ROW
EXECUTE FUNCTION tr_activation_status_changed();

