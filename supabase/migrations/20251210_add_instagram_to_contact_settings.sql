-- Migration: Add Instagram field to contact_settings
-- Date: 2025-12-10
-- Description: Add instagram handle field to contact_settings table

-- Add instagram column if it doesn't exist
ALTER TABLE contact_settings 
ADD COLUMN IF NOT EXISTS instagram TEXT DEFAULT '@onesms.sn';

-- Update existing row if any
UPDATE contact_settings 
SET instagram = '@onesms.sn' 
WHERE instagram IS NULL;
