-- Migration 011: RPC function to update photo tags (bypasses schema cache)
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.update_photo_tags(photo_id uuid, new_tags text[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.photos SET tags = new_tags WHERE id = photo_id;
$$;

GRANT EXECUTE ON FUNCTION public.update_photo_tags(uuid, text[])
  TO anon, authenticated, service_role;
