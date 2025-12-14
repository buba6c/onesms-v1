-- ============================================================================
-- Add icon_url column to services table for direct icon storage
-- ============================================================================

-- Add icon_url column if it doesn't exist
ALTER TABLE services ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_services_icon_url ON services(icon_url) WHERE icon_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN services.icon_url IS 'Direct URL to service icon (SVG or PNG) hosted on S3 or CDN';

COMMIT;
