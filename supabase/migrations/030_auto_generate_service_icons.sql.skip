-- ============================================================================
-- Database Trigger: Auto-generate icon for new services
-- ============================================================================

-- Create function to call Edge Function via HTTP
CREATE OR REPLACE FUNCTION trigger_icon_generation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate icon if icon_url is NULL
  IF NEW.icon_url IS NULL THEN
    -- Call Edge Function asynchronously using pg_net
    PERFORM
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/generate-service-icon',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'record', jsonb_build_object(
            'id', NEW.id,
            'code', NEW.code,
            'name', NEW.name,
            'display_name', NEW.display_name
          )
        )
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on services table
DROP TRIGGER IF EXISTS auto_generate_service_icon ON services;

CREATE TRIGGER auto_generate_service_icon
  AFTER INSERT ON services
  FOR EACH ROW
  EXECUTE FUNCTION trigger_icon_generation();

-- Add comment
COMMENT ON FUNCTION trigger_icon_generation() IS 'Automatically generates icon for new services by calling Edge Function';
COMMENT ON TRIGGER auto_generate_service_icon ON services IS 'Triggers icon generation when a new service is inserted';

-- ============================================================================
-- Setup pg_net extension (required for HTTP calls from triggers)
-- ============================================================================

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant permissions
GRANT USAGE ON SCHEMA net TO postgres, service_role;

-- ============================================================================
-- Configuration: Set Supabase URL and Service Role Key
-- ============================================================================

-- These need to be set as database settings
-- Run these commands in SQL Editor:

/*
ALTER DATABASE postgres SET app.supabase_url = 'https://htfqmamvmhdoixqcbbbw.supabase.co';
ALTER DATABASE postgres SET app.supabase_service_role_key = 'your_service_role_key_here';
*/

-- ============================================================================
-- Manual icon generation function (alternative approach)
-- ============================================================================

-- For services without pg_net, we can queue icon generation
CREATE TABLE IF NOT EXISTS icon_generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error text,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_icon_queue_status ON icon_generation_queue(status, created_at);

-- Simplified trigger that just queues the job
CREATE OR REPLACE FUNCTION queue_icon_generation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.icon_url IS NULL THEN
    INSERT INTO icon_generation_queue (service_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alternative trigger (comment out the HTTP one and use this if pg_net doesn't work)
-- DROP TRIGGER IF EXISTS auto_generate_service_icon ON services;
-- CREATE TRIGGER auto_generate_service_icon
--   AFTER INSERT ON services
--   FOR EACH ROW
--   EXECUTE FUNCTION queue_icon_generation();

COMMIT;
