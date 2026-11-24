-- Terms for user content (App Store guideline 1.2). Safe to run more than once.
-- Needs 017.
--
-- People agree to the terms (no objectionable content, no abuse; reports are
-- acted on within 24 hours) when they pick a username, or once from a card if
-- their account is older than this. Posting a hike or a comment needs it.
-- Writes from the SQL editor or the service role (no signed-in user, as in
-- the seed files) aren't checked.

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

-- The app sets these on the person's own row; the update policy from 009
-- already limits that to `id = auth.uid()`.

create or replace function apex_private.require_terms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return new; end if;
  if not exists (select 1 from public.profiles where id = uid and terms_accepted_at is not null) then
    raise exception using
      errcode = 'P0001',
      message = 'terms_required',
      hint = 'Agree to the terms in Apex first.';
  end if;
  return new;
end;
$$;
revoke all on function apex_private.require_terms() from public, anon, authenticated;

drop trigger if exists posts_require_terms on public.posts;
create trigger posts_require_terms
  before insert on public.posts
  for each row execute function apex_private.require_terms();

drop trigger if exists post_comments_require_terms on public.post_comments;
create trigger post_comments_require_terms
  before insert on public.post_comments
  for each row execute function apex_private.require_terms();
