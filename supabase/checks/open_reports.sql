-- Open reports, oldest first, with what was reported. Run in the SQL editor.
-- Apple expects reports to be acted on within 24 hours.
--
-- To act on one, use its id:
--   remove a comment:   delete from public.post_comments where id = '<target_comment>';
--   remove a post:      delete from public.posts where id = '<target_post>';
--   remove an account:  delete from auth.users where id = '<target_user>';
--   then close it:      update public.reports set status = 'actioned', reviewed_at = now() where id = '<id>';
--   or dismiss it:      update public.reports set status = 'dismissed', reviewed_at = now() where id = '<id>';
select
  r.id,
  r.created_at,
  r.reason,
  r.details,
  reporter.username as reporter,
  target.username as reported_user,
  r.target_user,
  r.target_post,
  r.target_comment,
  coalesce(c.body, r.snapshot) as reported_text,
  (select count(*) from public.reports o where o.target_user = r.target_user) as reports_on_this_user
from public.reports r
left join public.profiles reporter on reporter.id = r.reporter_id
left join public.profiles target on target.id = r.target_user
left join public.post_comments c on c.id = r.target_comment
where r.status = 'open'
order by r.created_at;
