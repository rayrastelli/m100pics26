-- Migration 014: saved slideshow order
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.slideshow_config (
  id         text PRIMARY KEY DEFAULT 'default',
  photo_ids  jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.slideshow_config TO anon, authenticated, service_role;

-- Seed the single default row so upserts always have something to update
INSERT INTO public.slideshow_config (id, photo_ids)
VALUES ('default', '[]')
ON CONFLICT (id) DO NOTHING;
