-- ============================================================================
-- 0010  Storage bucket for school branding assets (logos, imagery).
-- Public bucket: assets are shown pre-auth (login logo, header, footer), so
-- reads are public. Uploads happen server-side via the service role (admin
-- action), which bypasses storage RLS.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "Branding assets are publicly readable" on storage.objects;
create policy "Branding assets are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'branding');
