-- Migration 013: add student_name to profiles; default new signups to disabled
-- Run in Supabase SQL Editor.

-- 1. Add student_name column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS student_name text;

-- 2. Make new accounts start disabled (pending admin approval)
ALTER TABLE public.profiles
  ALTER COLUMN disabled SET DEFAULT true;

-- 3. Refresh grants
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
