-- Migration 006: Fix RLS policies + ensure tags column exists
-- Run this in the Supabase SQL Editor.
-- Safe to re-run.

-- ── 1. Ensure tags column exists ──────────────────────────────────────────────
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS slideshow boolean NOT NULL DEFAULT false;

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- GIN index for fast tag queries
CREATE INDEX IF NOT EXISTS photos_tags_gin ON public.photos USING gin(tags);


-- ── 2. Fix photos SELECT: all authenticated users see all photos ───────────────
DROP POLICY IF EXISTS "Users can view photos"          ON public.photos;
DROP POLICY IF EXISTS "Users can view their own photos" ON public.photos;
DROP POLICY IF EXISTS "Authenticated users see all photos" ON public.photos;

CREATE POLICY "Authenticated users see all photos"
  ON public.photos FOR SELECT
  TO authenticated
  USING (true);


-- ── 3. Fix photos UPDATE: any authenticated user can update tags/rating/etc ───
DROP POLICY IF EXISTS "Users can update their own photos"       ON public.photos;
DROP POLICY IF EXISTS "Authenticated users can update photos"   ON public.photos;

CREATE POLICY "Authenticated users can update photos"
  ON public.photos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ── 4. Fix photos DELETE: own photos or admin ─────────────────────────────────
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can delete photos"           ON public.photos;

CREATE POLICY "Users can delete photos"
  ON public.photos FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());


-- ── 5. INSERT stays restricted to own rows ────────────────────────────────────
-- (no change needed — existing policy is correct)


NOTIFY pgrst, 'reload schema';
