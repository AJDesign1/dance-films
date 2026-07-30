-- ============================================================================
-- 0012  Switch video host from Vimeo to Bunny Stream.
-- Column rename only — the app never called Vimeo's API, it just stored an
-- admin-entered video identifier and built an iframe embed URL from it. Same
-- shape, different host: lib/bunny.ts replaces lib/vimeo.ts.
-- ============================================================================
alter table public.performances  rename column vimeo_id            to bunny_video_id;
alter table public.show_videos   rename column full_show_vimeo_id  to full_show_bunny_video_id;

notify pgrst, 'reload schema';
