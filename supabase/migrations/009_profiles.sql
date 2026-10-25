-- Profiles (plan 3, step 2): one per account, with a unique username that
-- friends search for. Safe to run more than once.
--
-- Every signed-in user can read every profile's name and username, which is
-- what friend search needs. Nothing else about a person lives here. Hikes,
-- routes, photos and rankings stay owner-only until the friends step opens
-- them to friends.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Lowercase letters, digits and underscores, 3 to 20 long. The app
  -- lowercases before saving, so "Maya_C" and "maya_c" are the same name.
  username text not null unique
    check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prefix search ("may" finds "maya_c") uses this index.
create index if not exists profiles_username_prefix_idx
  on public.profiles (username text_pattern_ops);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No delete grant: a profile goes when its account does (delete_own_account
-- removes the auth user, and the foreign key cascades).
grant select, insert, update on public.profiles to authenticated;
