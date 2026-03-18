-- Migration 009: grant PostgREST access to all tables
-- Run in Supabase SQL Editor.
-- Required so PostgREST exposes the tables (separate from RLS).

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON public.photos        TO anon, authenticated, service_role;
GRANT ALL ON public.profiles      TO anon, authenticated, service_role;
GRANT ALL ON public.tag_definitions TO anon, authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
