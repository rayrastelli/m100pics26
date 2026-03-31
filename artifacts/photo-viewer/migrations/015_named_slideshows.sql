-- Migration 015: named slideshows (replaces single slideshow_config row)
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.slideshows (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  photo_ids  jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.slideshows TO anon, authenticated, service_role;

-- Migrate any existing saved order into the new table
INSERT INTO public.slideshows (name, photo_ids, created_at, updated_at)
SELECT 'Default', photo_ids, updated_at, updated_at
FROM   public.slideshow_config
WHERE  id = 'default'
  AND  jsonb_array_length(photo_ids) > 0
ON CONFLICT DO NOTHING;
