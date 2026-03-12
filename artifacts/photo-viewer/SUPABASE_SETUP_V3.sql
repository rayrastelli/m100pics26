-- Run this in your Supabase SQL Editor (after V2)
-- Safe to re-run — uses IF NOT EXISTS and IF EXISTS guards.

-- ============================================================
-- 1. Add user_tag to profiles (unique handle per user)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_tag text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_user_tag_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_tag_unique UNIQUE (user_tag);
  END IF;
END $$;

-- Allow users to update their own profile (needed to save their user_tag)
-- V2 only allowed admins to update; this adds a user-level policy.
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================
-- 2. Add rating to photos (1–7 scale, null = unrated)
-- ============================================================
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS rating integer CHECK (rating >= 1 AND rating <= 7);

-- ============================================================
-- 3. Add user_tag to photos (auto-populated from profile on upload)
-- ============================================================
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS user_tag text;

-- ============================================================
-- 4. Allow users and admins to update photos (needed for rating)
-- ============================================================
DROP POLICY IF EXISTS "Users can update their own photos" ON public.photos;
CREATE POLICY "Users can update their own photos"
  ON public.photos FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
