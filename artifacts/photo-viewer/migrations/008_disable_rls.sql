-- Migration 008: disable row level security on all tables
-- Run in Supabase SQL Editor.

ALTER TABLE public.photos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_definitions DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies (cleanup)
DROP POLICY IF EXISTS "Users can view their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.photos;
DROP POLICY IF EXISTS "Authenticated users can view all photos" ON public.photos;
DROP POLICY IF EXISTS "Authenticated users can update photos" ON public.photos;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tag_definitions;
DROP POLICY IF EXISTS "Authenticated users can insert tags" ON public.tag_definitions;
DROP POLICY IF EXISTS "Authenticated users can delete tags" ON public.tag_definitions;

NOTIFY pgrst, 'reload schema';
