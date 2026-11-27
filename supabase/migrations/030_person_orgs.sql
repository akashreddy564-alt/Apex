-- 030: a verified school or company shows under your @username (owner, 2026-11-27).
--
-- organization_members only lets you read your own rows (017), so profiles
-- couldn't show "Georgia Tech" for anyone. person_orgs returns a person's
-- verified (last year) organization names to themselves and to mutual
-- friends only, never to strangers or across a block. School names can be
-- K-12 schools, so this stays friends only like rankings (028/029).
--
-- Safe to run more than once.

create or replace function public.person_orgs(person uuid)
returns table (name text, kind text)
language sql
stable
security definer
set search_path = public
as $$
  select o.name, o.kind
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where auth.uid() is not null
    and m.user_id = person
    and m.verified_at > now() - interval '1 year'
    and (person = auth.uid() or public.is_mutual_friend(person))
  order by m.verified_at desc, o.name
  limit 3;
$$;

revoke all on function public.person_orgs(uuid) from public, anon;
grant execute on function public.person_orgs(uuid) to authenticated;
