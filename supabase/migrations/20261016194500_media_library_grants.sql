-- Some existing project default privileges grant TRUNCATE/TRIGGER to
-- authenticated. RLS does not protect TRUNCATE; explicitly remove ALL default
-- grants before restoring only the operations covered by the admin policy.
revoke all on public.media_assets from anon, authenticated;
grant select, insert, update on public.media_assets to authenticated;
