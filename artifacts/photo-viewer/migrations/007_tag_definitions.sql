-- Migration 007: master tag definitions table
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.tag_definitions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tag_definitions_name_unique UNIQUE (name)
);

ALTER TABLE public.tag_definitions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read tags
DROP POLICY IF EXISTS "Authenticated users can view tags" ON public.tag_definitions;
CREATE POLICY "Authenticated users can view tags"
  ON public.tag_definitions FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can insert tags
DROP POLICY IF EXISTS "Authenticated users can insert tags" ON public.tag_definitions;
CREATE POLICY "Authenticated users can insert tags"
  ON public.tag_definitions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- All authenticated users can delete tags
DROP POLICY IF EXISTS "Authenticated users can delete tags" ON public.tag_definitions;
CREATE POLICY "Authenticated users can delete tags"
  ON public.tag_definitions FOR DELETE
  TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
