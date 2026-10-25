-- Friends (plan 3, step 3): mutual friendships, request then accept.
-- Safe to run more than once. Needs 009 (profiles).
--
-- The app never writes this table directly. Every change goes through the
-- functions below, which check who is asking. People can read only the
-- friendships they're part of.

create table if not exists public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

-- One row per pair, whichever way the request went.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id);

alter table public.friendships enable row level security;

drop policy if exists "friendships_select_own" on public.friendships;
create policy "friendships_select_own"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

grant select on public.friendships to authenticated;

-- ---------------------------------------------------------------------------
-- are_friends: later steps (feed, routes, photos) use this in their policies.
-- ---------------------------------------------------------------------------
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = a and addressee_id = b) or (requester_id = b and addressee_id = a))
  );
$$;

-- ---------------------------------------------------------------------------
-- send_friend_request: asks `target` to be friends. If they already asked
-- you, this accepts instead. Returns 'requested', 'accepted' or 'friends'.
-- ---------------------------------------------------------------------------
create or replace function public.send_friend_request(target uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  existing public.friendships%rowtype;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if target = uid then raise exception 'You can''t add yourself'; end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'Pick a username first';
  end if;
  if not exists (select 1 from public.profiles where id = target) then
    raise exception 'That person isn''t on Apex';
  end if;

  select * into existing from public.friendships
  where (requester_id = uid and addressee_id = target)
     or (requester_id = target and addressee_id = uid)
  for update;

  if found then
    if existing.status = 'accepted' then return 'friends'; end if;
    if existing.requester_id = target then
      update public.friendships
      set status = 'accepted', accepted_at = now()
      where requester_id = target and addressee_id = uid;
      return 'accepted';
    end if;
    return 'requested';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (uid, target);
  return 'requested';
end;
$$;

-- ---------------------------------------------------------------------------
-- respond_friend_request: accept or decline a request someone sent you.
-- ---------------------------------------------------------------------------
create or replace function public.respond_friend_request(requester uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if accept then
    update public.friendships
    set status = 'accepted', accepted_at = now()
    where requester_id = requester and addressee_id = uid and status = 'pending';
  else
    delete from public.friendships
    where requester_id = requester and addressee_id = uid and status = 'pending';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- remove_friend: unfriend, or cancel a request you sent.
-- ---------------------------------------------------------------------------
create or replace function public.remove_friend(other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  delete from public.friendships
  where (requester_id = uid and addressee_id = other)
     or (requester_id = other and addressee_id = uid);
end;
$$;

-- ---------------------------------------------------------------------------
-- my_friendships: your friends and requests with the other person's profile.
-- relation is 'friend', 'incoming' (they asked you) or 'outgoing'.
-- ---------------------------------------------------------------------------
create or replace function public.my_friendships()
returns table (
  id uuid,
  username text,
  display_name text,
  relation text,
  since timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    case
      when f.status = 'accepted' then 'friend'
      when f.addressee_id = auth.uid() then 'incoming'
      else 'outgoing'
    end,
    coalesce(f.accepted_at, f.created_at)
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() is not null
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid())
  order by coalesce(f.accepted_at, f.created_at) desc;
$$;

-- ---------------------------------------------------------------------------
-- friend_count: shown on profiles. A count only, never the list.
-- ---------------------------------------------------------------------------
create or replace function public.friend_count(person uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.friendships
  where status = 'accepted' and (requester_id = person or addressee_id = person);
$$;

revoke all on function public.are_friends(uuid, uuid) from public, anon;
revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.my_friendships() from public, anon;
revoke all on function public.friend_count(uuid) from public, anon;

grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.my_friendships() to authenticated;
grant execute on function public.friend_count(uuid) to authenticated;
