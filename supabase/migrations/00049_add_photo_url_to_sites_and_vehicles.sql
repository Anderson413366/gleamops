-- Add photo_url column to sites and vehicles tables
ALTER TABLE sites ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS photo_url TEXT;
