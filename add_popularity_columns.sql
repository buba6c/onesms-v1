-- Add popularity and display_order columns to countries table
ALTER TABLE countries ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;
ALTER TABLE countries ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create indexes for faster sorting
CREATE INDEX IF NOT EXISTS idx_countries_popularity ON countries(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_countries_display_order ON countries(display_order DESC);

-- Update display_order for top countries (USA, Philippines, Indonesia, India, Russia, England, Canada, France, Germany)
UPDATE countries SET display_order = 1000 WHERE code = 'usa';
UPDATE countries SET display_order = 900 WHERE code = 'philippines';
UPDATE countries SET display_order = 800 WHERE code = 'indonesia';
UPDATE countries SET display_order = 700 WHERE code = 'india';
UPDATE countries SET display_order = 600 WHERE code = 'russia';
UPDATE countries SET display_order = 500 WHERE code = 'england';
UPDATE countries SET display_order = 400 WHERE code = 'canada';
UPDATE countries SET display_order = 300 WHERE code = 'france';
UPDATE countries SET display_order = 200 WHERE code = 'germany';
