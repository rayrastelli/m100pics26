-- Run this SQL in your Supabase SQL Editor AFTER running SUPABASE_SETUP.sql
-- (or run everything from scratch if starting fresh)

-- ============================================================
-- 1. PROFILES TABLE (stores role + user info)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Admin sees all profiles; users see only themselves
create policy "Admin can view all profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin'
    )
  );

create policy "Admin can update any profile"
  on public.profiles for update
  using (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin'
    )
  );

create policy "Admin can insert profiles"
  on public.profiles for insert
  with check (true);

create policy "Admin can delete profiles"
  on public.profiles for delete
  using (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'admin'
    )
  );

-- ============================================================
-- 2. TRIGGER: auto-create profile on new user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- 3. UPDATE PHOTOS POLICIES (admin sees/deletes all photos)
-- ============================================================
drop policy if exists "Users can view their own photos" on public.photos;
drop policy if exists "Users can delete their own photos" on public.photos;

create policy "Users can view photos"
  on public.photos for select
  using (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

create policy "Users can delete photos"
  on public.photos for delete
  using (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can insert photos on behalf of users (already covered by original insert policy)

-- ============================================================
-- 4. SET YOUR FIRST ADMIN USER
-- After signing up with your admin email, run this:
-- ============================================================
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@email.com';

-- ============================================================
-- 5. STORAGE: allow admin to delete any photo
-- ============================================================
drop policy if exists "Users can delete their own photos from storage" on storage.objects;

create policy "Users can delete their photos from storage"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );
