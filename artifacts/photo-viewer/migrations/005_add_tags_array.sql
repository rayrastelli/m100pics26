-- Migration 005: add tags array to photos
-- Run this in the Supabase SQL Editor

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Index for fast overlap queries
CREATE INDEX IF NOT EXISTS photos_tags_gin ON public.photos USING gin(tags);

NOTIFY pgrst, 'reload schema';
