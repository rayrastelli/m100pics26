-- Run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql/new)

-- 1. Create the photos table
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size integer not null,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table public.photos enable row level security;

-- 3. RLS Policies: users can only see/manage their own photos
create policy "Users can view their own photos"
  on public.photos for select
  using (auth.uid() = user_id);

create policy "Users can insert their own photos"
  on public.photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own photos"
  on public.photos for delete
  using (auth.uid() = user_id);

-- 4. Create the storage bucket
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- 5. Storage RLS Policies
create policy "Users can upload their own photos"
  on storage.objects for insert
  with check (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);

create policy "Public read access to photos"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "Users can delete their own photos from storage"
  on storage.objects for delete
  using (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
