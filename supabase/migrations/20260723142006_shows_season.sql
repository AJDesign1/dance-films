-- ============================================================================
-- 0006  Shows: add `season` (the "Season / tag" the admin editor captures and
-- the shop/show hero display, e.g. "Summer Showcase"). Backfill the seed rows.
-- ============================================================================
alter table public.shows add column if not exists season text;

update public.shows set season = 'Summer Showcase' where slug = 'reflections';
update public.shows set season = 'Winter Show'      where slug = 'once-upon-a-time';
update public.shows set season = 'Summer Showcase' where slug = 'electric';
