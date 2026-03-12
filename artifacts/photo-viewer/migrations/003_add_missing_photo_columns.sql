-- ============================================================
-- Migration 003 — Add missing columns to existing photos table
--
-- If photos table was created from the original setup script
-- (before ratings and user_tag were added), these columns
-- will be missing. This migration adds them safely.
-- Safe to re-run — uses IF NOT EXISTS guards.
-- ============================================================

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS rating  integer CHECK (rating >= 1 AND rating <= 7);

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS user_tag text;

-- Reload the schema cache so PostgREST picks up the new columns
NOTIFY pgrst, 'reload schema';
