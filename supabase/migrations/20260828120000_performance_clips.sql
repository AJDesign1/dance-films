-- ============================================================================
-- 0016  Dances as virtual clips of the full-show video.
--
-- A dance can now get its video one of two ways:
--   'show'       — plays the show's own full_show_bunny_video_id, seeking to
--                  clip_start_seconds and stopping at clip_end_seconds. One
--                  upload per show instead of one per dance.
--   'standalone' — its own bunny_video_id, exactly as before.
--
-- bunny_video_id is deliberately left alone (still `not null`, '' meaning
-- "none") so nothing existing has to be rewritten or made nullable.
--
-- Backfill matters: the column default is 'show' so *new* dances get the
-- preferred behaviour, but every dance that already has its own uploaded video
-- is switched to 'standalone' below, so existing content keeps playing exactly
-- as it did rather than silently pointing at the full show.
-- ============================================================================
create type public.performance_video_source as enum ('show', 'standalone');

alter table public.performances
  add column if not exists video_source public.performance_video_source not null default 'show',
  add column if not exists clip_start_seconds int,
  add column if not exists clip_end_seconds int;

update public.performances
   set video_source = 'standalone'
 where coalesce(bunny_video_id, '') <> '';

-- A clip that ends before it starts is a data-entry slip, not a valid state.
alter table public.performances
  add constraint performances_clip_range_ck
  check (
    clip_start_seconds is null
    or clip_end_seconds is null
    or clip_end_seconds > clip_start_seconds
  );
