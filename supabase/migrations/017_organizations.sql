-- Schools and companies (launch gaps, 2026-11-23).
-- Safe to run more than once. Needs 016.
--
-- You join your school's or company's board by proving you have an email at
-- its domain: the `org-verify` Edge Function emails a 6-digit code, and
-- confirm_org_code() checks it. Only the domain is kept, never the address.
-- The first verified person from a new domain names the organization; anyone
-- verified at that domain later joins it. Personal mail domains are refused.
-- A verification counts for a year; after that you verify again to stay on
-- the board. Members see names, totals and places only, as with groups.
--
-- The app never writes these tables directly.

create schema if not exists apex_private;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Personal mail domains: no school or company behind them.
-- ---------------------------------------------------------------------------
create table if not exists apex_private.personal_domains (domain text primary key);

insert into apex_private.personal_domains (domain) values
  ('gmail.com'), ('googlemail.com'), ('yahoo.com'), ('ymail.com'), ('rocketmail.com'),
  ('hotmail.com'), ('outlook.com'), ('live.com'), ('msn.com'), ('icloud.com'), ('me.com'),
  ('mac.com'), ('aol.com'), ('proton.me'), ('protonmail.com'), ('pm.me'), ('gmx.com'),
  ('gmx.net'), ('mail.com'), ('zoho.com'), ('yandex.com'), ('yandex.ru'), ('hey.com'),
  ('fastmail.com'), ('tutanota.com'), ('tuta.io'), ('qq.com'), ('163.com'), ('126.com'),
  ('comcast.net'), ('verizon.net'), ('att.net'), ('sbcglobal.net'), ('cox.net'),
  ('charter.net'), ('duck.com'), ('mailinator.com'), ('guerrillamail.com'),
  ('10minutemail.com'), ('tempmail.com'), ('yopmail.com'), ('sharklasers.com')
on conflict (domain) do nothing;

create or replace function apex_private.is_personal_domain(d text)
returns boolean
language sql
stable
security definer
set search_path = apex_private
as $$
  select exists (select 1 from apex_private.personal_domains where domain = lower(d));
$$;

-- ---------------------------------------------------------------------------
-- organizations, organization_domains, organization_members
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 60),
  kind text not null check (kind in ('school', 'company')),
  time_zone text not null default 'UTC',
  created_at timestamptz not null default now()
);

create table if not exists public.organization_domains (
  domain text primary key check (domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
  organization_id uuid not null references public.organizations (id) on delete cascade
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  domain text not null,
  verified_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx on public.organization_members (user_id);

alter table public.organizations enable row level security;
alter table public.organization_domains enable row level security;
alter table public.organization_members enable row level security;

create or replace function public.is_org_member(o uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Only a verification from the last year opens the board.
  select exists (
    select 1 from public.organization_members
    where organization_id = o and user_id = auth.uid() and verified_at > now() - interval '1 year'
  );
$$;

drop policy if exists "organizations_select_members" on public.organizations;
create policy "organizations_select_members"
  on public.organizations for select to authenticated
  using (public.is_org_member(id));

drop policy if exists "organization_members_select_members" on public.organization_members;
create policy "organization_members_select_members"
  on public.organization_members for select to authenticated
  -- Your own rows only. Other members are seen through organization_board(),
  -- which applies blocks and the one-year limit.
  using (user_id = auth.uid());

grant select on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
-- organization_domains stays unreadable: nobody lists which domains exist.

-- ---------------------------------------------------------------------------
-- Pending codes. One row per person; a new request replaces the old code.
-- `verified_domain` is set once the code checks out but the domain had no
-- organization yet, so create_organization() knows what they proved.
-- ---------------------------------------------------------------------------
create table if not exists apex_private.org_codes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  domain text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  verified_domain text,
  verified_until timestamptz
);

create table if not exists apex_private.org_code_sends (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index if not exists org_code_sends_idx on apex_private.org_code_sends (user_id, at desc);

-- The email's domain, lowercased, or null when it isn't an email.
create or replace function apex_private.email_domain(email text)
returns text
language sql
immutable
as $$
  select case
    when btrim(coalesce(email, '')) ~* '^[a-z0-9._%+''-]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$'
      then lower(split_part(btrim(email), '@', 2))
  end;
$$;

-- ---------------------------------------------------------------------------
-- issue_org_code: called by the org-verify Edge Function with the service
-- role, after it has checked who is asking. Returns the code to email.
-- Not callable from the app, so nobody can read a code without the inbox.
-- ---------------------------------------------------------------------------
create or replace function public.issue_org_code(person uuid, email text)
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  d text := apex_private.email_domain(email);
  code text;
begin
  if person is null or not exists (select 1 from public.profiles where id = person) then
    raise exception 'Pick a username first';
  end if;
  if d is null then raise exception 'That doesn’t look like an email address'; end if;
  if apex_private.is_personal_domain(d) then
    raise exception 'Use your school or work email, not a personal one';
  end if;
  if (select count(*) from public.organization_members where user_id = person) >= 3
     and not exists (
       select 1 from public.organization_members m
       join public.organization_domains od on od.organization_id = m.organization_id
       where m.user_id = person and od.domain = d
     ) then
    raise exception 'You''re in 3 schools or companies already. Leave one first.';
  end if;

  perform pg_advisory_xact_lock(hashtext(person::text || ':org_code'));
  if (select count(*) from apex_private.org_code_sends where user_id = person and at > now() - interval '1 hour') >= 3
     or (select count(*) from apex_private.org_code_sends where user_id = person and at > now() - interval '1 day') >= 8 then
    raise exception using errcode = 'P0429', message = 'rate_limited:org_code',
      hint = 'Try again in a little while.';
  end if;
  insert into apex_private.org_code_sends (user_id) values (person);
  delete from apex_private.org_code_sends where user_id = person and at < now() - interval '1 day';

  -- From pgcrypto's CSPRNG, not random(), so codes can't be predicted.
  code := lpad(((('x' || encode(extensions.gen_random_bytes(4), 'hex'))::bit(32)::bigint % 1000000))::text, 6, '0');
  insert into apex_private.org_codes (user_id, domain, code_hash, expires_at, attempts, verified_domain, verified_until)
  values (person, d, encode(digest(person::text || ':' || code, 'sha256'), 'hex'), now() + interval '15 minutes', 0, null, null)
  on conflict (user_id) do update set
    domain = excluded.domain,
    code_hash = excluded.code_hash,
    expires_at = excluded.expires_at,
    attempts = 0,
    verified_domain = null,
    verified_until = null;
  return code;
end;
$$;

-- Adds or refreshes a verified membership. Internal.
create or replace function apex_private.add_org_member(person uuid, org uuid, d text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.organization_members (organization_id, user_id, domain, verified_at)
  values (org, person, d, now())
  on conflict (organization_id, user_id) do update set verified_at = now(), domain = excluded.domain;
$$;

-- ---------------------------------------------------------------------------
-- confirm_org_code: the code from the email. Returns
--   {"status":"joined","organization_id":…,"name":…}  when the domain has an organization, or
--   {"status":"name_it","domain":…,"kind":…}           when you're the first from it.
-- Five wrong tries and the code is spent.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_org_code(code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  uid uuid := auth.uid();
  pending apex_private.org_codes%rowtype;
  org public.organizations%rowtype;
  typed text := regexp_replace(coalesce(code, ''), '\D', '', 'g');
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into pending from apex_private.org_codes where user_id = uid for update;
  if not found or pending.expires_at < now() or pending.attempts >= 5 then
    raise exception 'That code has expired. Send a new one.';
  end if;
  if encode(digest(uid::text || ':' || typed, 'sha256'), 'hex') <> pending.code_hash then
    update apex_private.org_codes set attempts = attempts + 1 where user_id = uid;
    -- Return rather than raise, so the counted try isn't rolled back.
    return jsonb_build_object('status', 'wrong_code', 'tries_left', greatest(0, 4 - pending.attempts));
  end if;

  select o.* into org from public.organization_domains od
  join public.organizations o on o.id = od.organization_id
  where od.domain = pending.domain;

  if found then
    perform apex_private.add_org_member(uid, org.id, pending.domain);
    delete from apex_private.org_codes where user_id = uid;
    return jsonb_build_object('status', 'joined', 'organization_id', org.id, 'name', org.name, 'kind', org.kind);
  end if;

  update apex_private.org_codes
  set verified_domain = pending.domain, verified_until = now() + interval '1 hour', code_hash = '-', attempts = 5
  where user_id = uid;
  return jsonb_build_object(
    'status', 'name_it',
    'domain', pending.domain,
    'kind', case when pending.domain ~ '(\.edu|\.ac\.[a-z]{2}|\.edu\.[a-z]{2}|\.k12\.[a-z.]+)$' then 'school' else 'company' end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- create_organization: the first verified person from a domain names it.
-- Returns its id.
-- ---------------------------------------------------------------------------
create or replace function public.create_organization(org_name text, org_kind text, tz text default 'UTC')
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pending apex_private.org_codes%rowtype;
  zone text := coalesce(nullif(btrim(tz), ''), 'UTC');
  clean text := regexp_replace(btrim(coalesce(org_name, '')), '\s+', ' ', 'g');
  existing uuid;
  new_id uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into pending from apex_private.org_codes where user_id = uid for update;
  if not found or pending.verified_domain is null or pending.verified_until < now() then
    raise exception 'Verify your email first';
  end if;
  if char_length(clean) < 2 or char_length(clean) > 60 then
    raise exception 'Names are 2 to 60 characters';
  end if;
  if org_kind not in ('school', 'company') then raise exception 'Pick school or company'; end if;
  if not exists (select 1 from pg_timezone_names where name = zone) then zone := 'UTC'; end if;

  -- Someone from the same domain may have named it a moment ago.
  select organization_id into existing from public.organization_domains where domain = pending.verified_domain;
  if existing is not null then
    new_id := existing;
  else
    insert into public.organizations (name, kind, time_zone) values (clean, org_kind, zone) returning id into new_id;
    insert into public.organization_domains (domain, organization_id) values (pending.verified_domain, new_id);
  end if;

  perform apex_private.add_org_member(uid, new_id, pending.verified_domain);
  delete from apex_private.org_codes where user_id = uid;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- leave_organization: the last person out deletes it, freeing the domain.
-- ---------------------------------------------------------------------------
create or replace function public.leave_organization(o uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from public.organization_members where organization_id = o and user_id = auth.uid();
  if not exists (select 1 from public.organization_members where organization_id = o) then
    delete from public.organizations where id = o;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- org_places (internal): verified members' places by gain in a window.
-- Members whose verification is over a year old drop off until they renew.
-- ---------------------------------------------------------------------------
create or replace function public.org_places(o uuid, since timestamptz)
returns table (user_id uuid, gain_m integer, hikes integer, km numeric, place integer)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with members as (
    select m.user_id from public.organization_members m
    where m.organization_id = o and m.verified_at > now() - interval '1 year'
  ),
  hikes as (
    select
      l.user_id,
      l.id,
      apex_private.board_gain(l.trail_id, l.elevation_gain_m, l.recorded_path) as gain_m,
      round((st_length(l.recorded_path) / 1000)::numeric, 2) as km
    from public.hike_logs l
    where l.user_id in (select user_id from members)
      and l.recorded_path is not null
      and l.created_at >= since
  )
  select
    m.user_id,
    coalesce(sum(h.gain_m), 0)::integer,
    count(h.id)::integer,
    coalesce(sum(h.km), 0),
    (rank() over (order by coalesce(sum(h.gain_m), 0) desc))::integer
  from members m
  left join hikes h on h.user_id = m.user_id
  group by m.user_id;
$$;

-- ---------------------------------------------------------------------------
-- my_organizations: yours, with your place this week.
-- ---------------------------------------------------------------------------
create or replace function public.my_organizations()
returns table (
  id uuid,
  name text,
  kind text,
  domain text,
  verified_at timestamptz,
  member_count integer,
  place integer,
  week_gain_m integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id,
    o.name,
    o.kind,
    m.domain,
    m.verified_at,
    (select count(*)::integer from public.organization_members x
      where x.organization_id = o.id and x.verified_at > now() - interval '1 year'),
    p.place,
    coalesce(p.gain_m, 0)
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  left join lateral (
    select pl.place, pl.gain_m
    from public.org_places(o.id, public.period_start(o.time_zone, 'week')) pl
    where pl.user_id = auth.uid()
  ) p on true
  where m.user_id = auth.uid()
  order by m.verified_at;
$$;

-- ---------------------------------------------------------------------------
-- organization_board: 'week', 'month' or 'year'. Members only.
-- ---------------------------------------------------------------------------
create or replace function public.organization_board(o uuid, period text default 'week')
returns table (
  user_id uuid,
  username text,
  display_name text,
  gain_m integer,
  hikes integer,
  km numeric,
  place integer,
  is_me boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    pr.username,
    pr.display_name,
    p.gain_m,
    p.hikes,
    p.km,
    p.place,
    p.user_id = auth.uid()
  from public.organizations org
  cross join lateral public.org_places(org.id, public.period_start(org.time_zone, period)) p
  join public.profiles pr on pr.id = p.user_id
  where org.id = o
    and public.is_org_member(o)
    and not public.is_blocked_between(auth.uid(), p.user_id)
  order by p.place, pr.display_name;
$$;

revoke all on function apex_private.is_personal_domain(text) from public, anon, authenticated;
revoke all on function apex_private.email_domain(text) from public, anon, authenticated;
revoke all on function apex_private.add_org_member(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.issue_org_code(uuid, text) from public, anon, authenticated;
revoke all on function public.org_places(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.confirm_org_code(text) from public, anon;
revoke all on function public.create_organization(text, text, text) from public, anon;
revoke all on function public.leave_organization(uuid) from public, anon;
revoke all on function public.my_organizations() from public, anon;
revoke all on function public.organization_board(uuid, text) from public, anon;

grant execute on function public.issue_org_code(uuid, text) to service_role;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.confirm_org_code(text) to authenticated;
grant execute on function public.create_organization(text, text, text) to authenticated;
grant execute on function public.leave_organization(uuid) to authenticated;
grant execute on function public.my_organizations() to authenticated;
grant execute on function public.organization_board(uuid, text) to authenticated;
