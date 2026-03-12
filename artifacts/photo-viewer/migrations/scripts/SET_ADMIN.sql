-- ============================================================
-- Set a user as admin
-- Run in Supabase SQL Editor
-- ============================================================

-- Replace with the user's email address
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'sammy@zztest.co';

-- Verify
SELECT id, email, role FROM public.profiles WHERE email = 'sammy@zztest.co';
