-- Migration 012: add thumbnail and medium image paths to photos
-- Run in Supabase SQL Editor.

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS thumb_path text,
  ADD COLUMN IF NOT EXISTS med_path   text;

GRANT ALL ON public.photos TO anon, authenticated, service_role;
