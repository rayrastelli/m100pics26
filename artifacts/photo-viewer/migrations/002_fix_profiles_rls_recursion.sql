-- ============================================================
-- Migration 002 — Fix infinite recursion in profiles RLS
--
-- Root cause: the SELECT policy on public.profiles checks
-- "is this user an admin?" by querying public.profiles,
-- which re-triggers the same SELECT policy → infinite loop.
--
-- Fix: a SECURITY DEFINER function reads profiles without
-- going through RLS, breaking the recursion.
-- ============================================================


-- Helper function: check if the current user is an admin.
-- SECURITY DEFINER = runs as the function owner, bypasses RLS.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ============================================================
-- Rebuild profiles policies using is_admin()
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all profiles"        ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile"       ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles"          ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles"          ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());


-- ============================================================
-- Rebuild photos policies using is_admin()
-- ============================================================
DROP POLICY IF EXISTS "Users can view photos"             ON public.photos;
DROP POLICY IF EXISTS "Users can delete photos"           ON public.photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.photos;

CREATE POLICY "Users can view photos"
  ON public.photos FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete photos"
  ON public.photos FOR DELETE
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update their own photos"
  ON public.photos FOR UPDATE
  USING (auth.uid() = user_id OR public.is_admin());


-- ============================================================
-- Rebuild storage policies using is_admin()
-- ============================================================
DROP POLICY IF EXISTS "Users can delete their photos from storage" ON storage.objects;

CREATE POLICY "Users can delete their photos from storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );
