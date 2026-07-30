-- ============================================================================
-- 0013  Storage bucket for show cover artwork.
-- Public bucket: artwork is shown pre-auth (shop cards, show hero), so reads
-- are public. Uploads happen server-side via the service role (admin
-- action), which bypasses storage RLS. Unlike the `branding` bucket, no
-- broad SELECT policy on storage.objects is added — a public bucket already
-- serves object GETs (getPublicUrl) without one; that policy only matters
-- for list()/authenticated-path access, which this app never uses.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('artwork', 'artwork', true)
on conflict (id) do nothing;
