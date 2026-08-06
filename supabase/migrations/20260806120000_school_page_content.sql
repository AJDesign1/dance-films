-- School page content: the "About <school>" band and the "Meet the media team"
-- band on the shop page. Both were hardcoded in the page component (the media
-- team carried placeholder copy visible to real customers); they're now
-- per-school and editable from the school admin.
--
-- Columns on `schools` rather than a new table: this is one row's worth of
-- content per school, same shape as the logo/hero URLs already living here.
-- No new grants or policies needed — the row-level policies in
-- 20260723142002_security.sql and the table-level grants in
-- 20260723142001_schema.sql already cover every column of this table.

alter table public.schools
  add column if not exists about_text      text,
  add column if not exists about_image_url text,
  add column if not exists team_name       text,
  add column if not exists team_role       text,
  add column if not exists team_bio        text,
  add column if not exists team_tagline    text,
  add column if not exists team_image_url  text;

comment on column public.schools.about_text is
  'Body copy for the "About <school>" band on the shop page. Null hides the band.';
comment on column public.schools.team_name is
  'Media-team member name. Null (with no bio/image) hides the media-team band.';

-- Carry over the copy that was hardcoded in app/(platform)/shows/page.tsx so
-- Liberty's live page reads the same after this migration — minus the
-- "[Placeholder — final copy to follow.]" marker, which shouldn't have been
-- customer-visible in the first place.
update public.schools set
  team_name    = 'Alex Jarvis',
  team_role    = 'Founder, Dance Films',
  team_bio     = 'Alex is the videographer behind Dance Films, capturing dance shows with a cinematic eye for the moments that matter.',
  team_tagline = 'Multi-camera capture, colour-graded for a cinematic finish.'
where slug = 'liberty' and team_name is null;
