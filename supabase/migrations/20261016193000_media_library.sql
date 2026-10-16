-- Image files remain in the existing public buckets. Catalogue/notes are
-- admin-only; only in-use title/alt text is passed to parent pages by the app.
begin;
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  bucket text not null check (bucket in ('branding', 'artwork')),
  storage_path text not null,
  filename text not null,
  title text not null default '' check (length(title) <= 200),
  alt_text text check (length(alt_text) <= 500),
  caption text not null default '' check (length(caption) <= 2000),
  description text not null default '' check (length(description) <= 5000),
  created_at timestamptz not null default now(),
  unique (bucket, storage_path),
  check (split_part(storage_path, '/', 1) = school_id::text)
);
create index media_assets_school_created on public.media_assets(school_id, created_at desc);
alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon, authenticated;
grant select, insert, update on public.media_assets to authenticated;
grant all on public.media_assets to service_role;
create policy "Admins manage media" on public.media_assets for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- Index ALL existing school uploads, including replaced/unassigned images.
-- No files are moved, replaced, or deleted and existing URLs stay valid.
insert into public.media_assets (school_id, bucket, storage_path, filename, title, created_at)
select s.id, o.bucket_id, o.name, regexp_replace(o.name, '^.*/', ''),
       regexp_replace(regexp_replace(o.name, '^.*/', ''), '\.[^.]+$', ''), o.created_at
from storage.objects o join public.schools s on split_part(o.name, '/', 1) = s.id::text
where o.bucket_id in ('branding', 'artwork')
on conflict (bucket, storage_path) do nothing;
commit;
