-- Migration 010: ensure all columns exist + full grants (safe to re-run)
-- Run in Supabase SQL Editor, then click:
-- Dashboard → Project Settings → API → "Reload schema cache"

-- ── photos table ──────────────────────────────────────────────────────────────
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS tags       text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS slideshow  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active     boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS rating     int,
  ADD COLUMN IF NOT EXISTS title      text;

CREATE INDEX IF NOT EXISTS photos_tags_gin ON public.photos USING gin(tags);

-- ── tag_definitions table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tag_definitions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tag_definitions_name_unique UNIQUE (name)
);

-- ── disable RLS everywhere ────────────────────────────────────────────────────
ALTER TABLE public.photos          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_definitions DISABLE ROW LEVEL SECURITY;

-- ── grant full access to all PostgREST roles ──────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON public.photos          TO anon, authenticated, service_role;
GRANT ALL ON public.profiles        TO anon, authenticated, service_role;
GRANT ALL ON public.tag_definitions TO anon, authenticated, service_role;
