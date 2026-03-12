-- ============================================================
-- FOLIO — Complete Database Setup (run once in Supabase SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS
-- ============================================================


-- ============================================================
-- 1. PHOTOS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.photos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  storage_path text NOT NULL,
  filename     text NOT NULL,
  mime_type    text NOT NULL,
  size         integer NOT NULL,
  width        integer,
  height       integer,
  rating       integer CHECK (rating >= 1 AND rating <= 7),
  user_tag     text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  disabled   boolean NOT NULL DEFAULT false,
  user_tag   text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_tag_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_tag_unique UNIQUE (user_tag);
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. TRIGGER: auto-create profile row on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================
-- 4. PHOTOS — RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own photos"   ON public.photos;
DROP POLICY IF EXISTS "Users can view photos"             ON public.photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.photos;
DROP POLICY IF EXISTS "Users can delete photos"           ON public.photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.photos;

CREATE POLICY "Users can view photos"
  ON public.photos FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can insert their own photos"
  ON public.photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete photos"
  ON public.photos FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can update their own photos"
  ON public.photos FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 5. PROFILES — RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all profiles"       ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile"      ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles"         ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles"         ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin'
    )
  );

CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin'
    )
  );


-- ============================================================
-- 6. STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 7. STORAGE — RLS POLICIES
-- ============================================================
DROP POLICY IF EXISTS "Users can upload their own photos"            ON storage.objects;
DROP POLICY IF EXISTS "Public read access to photos"                 ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own photos from storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their photos from storage"   ON storage.objects;

CREATE POLICY "Users can upload their own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public read access to photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

CREATE POLICY "Users can delete their photos from storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );


-- ============================================================
-- 8. BACKFILL: create profile rows for any existing auth users
--    (handles accounts created before the trigger existed)
-- ============================================================
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- DONE. After running this:
--
-- 1. Disable email confirmation:
--    Auth → Providers → Email → turn off "Confirm email"
--
-- 2. Set your admin account:
--    UPDATE public.profiles SET role = 'admin' WHERE email = 'your@email.com';
-- ============================================================
