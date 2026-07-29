-- ============================================================================
-- 0011  Download tracking — informational "Downloaded" badge, not a gate.
--
-- Separate from entitlements (which tracks ownership, not usage). One row per
-- user/show marks "this owner has downloaded the full show before" — used
-- purely to show a "Downloaded" badge; it never restricts further downloads.
-- ============================================================================
create table public.downloads (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  show_id    uuid not null references public.shows(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, show_id)
);
create index downloads_user_idx on public.downloads (user_id);

alter table public.downloads enable row level security;

create policy "downloads: read own or admin" on public.downloads
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Self-service insert, but only for a show the user actually has an
-- entitlement to — mirrors the same has_entitlement() guard show_videos/
-- performances already use, so a user can't fake a "downloaded" badge for a
-- show they don't own.
create policy "downloads: insert own when entitled" on public.downloads
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_entitlement(show_id));

grant select, insert on public.downloads to authenticated;

notify pgrst, 'reload schema';
