-- Add flag_url column to countries table
-- This will store the real flag image URL from flagcdn.com

ALTER TABLE countries 
ADD COLUMN IF NOT EXISTS flag_url TEXT;

COMMENT ON COLUMN countries.flag_url IS 'URL to the country flag image from flagcdn.com';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_countries_flag_url ON countries(flag_url) WHERE flag_url IS NOT NULL;
