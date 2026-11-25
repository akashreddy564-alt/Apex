-- 022: First Ascent skips Apex's own accounts, and #002 goes back to a real hiker.
--
-- 021 kept test accounts out by email, but it named the reviewer as
-- appreview@example.com. The real reviewer signed up as review@hikeapex.com,
-- so it took #002. Every @hikeapex.com address is ours (review, support,
-- throwaway test accounts), so none of them take a number.
--
-- Safe to run more than once.

create or replace function public.is_test_account(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select u.email ilike '%@apex-test.invalid'
         or u.email ilike '%@hikeapex.com'
         or u.email = 'appreview@example.com'
     from auth.users u where u.id = uid),
    false
  );
$$;
revoke all on function public.is_test_account(uuid) from public, anon, authenticated;

-- The trigger refuses every change to a number, so step around it for this one
-- clean-up. Numbers taken by our own accounts are cleared, then the counter
-- goes back to the highest number a real hiker holds. On 2026-11-25 that is
-- #001 (the owner), so the next real sign-up gets #002.
alter table public.profiles disable trigger profiles_first_ascent;

update public.profiles
set ascent_no = null
where ascent_no is not null
  and public.is_test_account(id);

alter table public.profiles enable trigger profiles_first_ascent;

update public.first_ascent_counter
set last_no = (select coalesce(max(ascent_no), 0) from public.profiles)
where id;
