-- Run this in your Supabase SQL Editor (after V2)

-- 1. Add rating to photos (1-7 scale, nullable = unrated)
ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS rating integer CHECK (rating >= 1 AND rating <= 7);

-- 2. Add user_tag to profiles (unique, nullable for existing users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_tag text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_tag_unique UNIQUE (user_tag);

-- 3. Allow users to update their own photo ratings
-- (the existing "Users can insert their own photos" policy already covers updates
--  if it's their own photo, but we need an explicit update policy)
CREATE POLICY IF NOT EXISTS "Users can update their own photos"
  ON public.photos FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Allow users to update their own profile (for user_tag)
CREATE POLICY IF NOT EXISTS "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);
