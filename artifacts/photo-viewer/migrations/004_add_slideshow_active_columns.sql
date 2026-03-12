-- ============================================================
-- Migration 004 — Add slideshow and active columns to photos
-- Safe to re-run — uses IF NOT EXISTS guards.
-- ============================================================

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS slideshow boolean NOT NULL DEFAULT false;

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Reload the schema cache so PostgREST picks up the new columns
NOTIFY pgrst, 'reload schema';
