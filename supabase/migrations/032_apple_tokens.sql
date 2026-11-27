-- 032: Apple refresh tokens, so deleting an account can revoke Sign in with Apple.
--
-- App Store guideline 5.1.1(v): deleting an account must also revoke the
-- person's Apple tokens. At sign-in the app sends Apple's one-time
-- authorization code to the apple-token Edge Function, which trades it for a
-- refresh token and saves it here. On account deletion the same function sends
-- that token to Apple's revoke endpoint before the account is removed.
--
-- The table lives in apex_private (not exposed over the API) and only the
-- service role can reach it, through the two functions below. The row goes
-- with the auth user (on delete cascade).

create schema if not exists apex_private;

create table if not exists apex_private.apple_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table apex_private.apple_tokens enable row level security;
revoke all on table apex_private.apple_tokens from public, anon, authenticated;

-- Save (or replace) a person's Apple refresh token.
create or replace function public.save_apple_token(person uuid, token text)
returns void
language sql
security definer
set search_path = apex_private, public
as $$
  insert into apex_private.apple_tokens (user_id, refresh_token, updated_at)
  values (person, token, now())
  on conflict (user_id) do update
    set refresh_token = excluded.refresh_token, updated_at = now();
$$;

-- A person's Apple refresh token, or null when there isn't one.
create or replace function public.apple_token(person uuid)
returns text
language sql
stable
security definer
set search_path = apex_private, public
as $$
  select refresh_token from apex_private.apple_tokens where user_id = person;
$$;

-- Forget the token once Apple has revoked it.
create or replace function public.forget_apple_token(person uuid)
returns void
language sql
security definer
set search_path = apex_private, public
as $$
  delete from apex_private.apple_tokens where user_id = person;
$$;

revoke all on function public.save_apple_token(uuid, text) from public, anon, authenticated;
revoke all on function public.apple_token(uuid) from public, anon, authenticated;
revoke all on function public.forget_apple_token(uuid) from public, anon, authenticated;
grant execute on function public.save_apple_token(uuid, text) to service_role;
grant execute on function public.apple_token(uuid) to service_role;
grant execute on function public.forget_apple_token(uuid) to service_role;
