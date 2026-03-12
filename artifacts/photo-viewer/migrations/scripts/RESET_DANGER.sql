-- ============================================================
-- !! DANGER — FULL DATABASE RESET !!
-- 
-- This DESTROYS all Folio data: photos metadata, user profiles,
-- user tags, ratings — everything. Cannot be undone.
--
-- Storage files (the actual image files) must be deleted
-- separately in the Supabase Dashboard → Storage → photos bucket
-- → select all → delete.
--
-- After running this, run migrations in order:
--   001_initial_setup.sql
--   002_fix_profiles_rls_recursion.sql
-- ============================================================


-- 1. Drop trigger first (depends on the function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- 3. Drop tables (CASCADE removes all dependent policies + constraints)
DROP TABLE IF EXISTS public.photos   CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 4. Remove storage policies
DROP POLICY IF EXISTS "Users can upload their own photos"          ON storage.objects;
DROP POLICY IF EXISTS "Public read access to photos"               ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their photos from storage" ON storage.objects;

-- 5. Remove the storage bucket entry
--    Note: this only removes the DB record. If the bucket still
--    has files, delete them first in the Dashboard → Storage.
DELETE FROM storage.buckets WHERE id = 'photos';


-- ============================================================
-- Done. Database is clean.
-- Now run 001_initial_setup.sql then 002_fix_profiles_rls_recursion.sql
-- ============================================================
