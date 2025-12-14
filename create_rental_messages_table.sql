-- Table pour stocker les messages des rentals (persistance après expiration)
CREATE TABLE IF NOT EXISTS rental_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_id UUID REFERENCES rentals(id) ON DELETE CASCADE,
  rent_id TEXT NOT NULL, -- SMS-Activate rent ID
  phone_from TEXT,
  text TEXT NOT NULL,
  service TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide par rental
CREATE INDEX IF NOT EXISTS idx_rental_messages_rental_id ON rental_messages(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_messages_rent_id ON rental_messages(rent_id);

-- Unique constraint pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_messages_unique 
ON rental_messages(rent_id, phone_from, text, received_at);

-- Enable RLS
ALTER TABLE rental_messages ENABLE ROW LEVEL SECURITY;

-- Policy: users can see messages for their rentals
CREATE POLICY "Users can view their rental messages"
ON rental_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rentals 
    WHERE rentals.id = rental_messages.rental_id 
    AND rentals.user_id = auth.uid()
  )
);

-- Policy: service role can insert
CREATE POLICY "Service role can insert rental messages"
ON rental_messages FOR INSERT
WITH CHECK (true);
