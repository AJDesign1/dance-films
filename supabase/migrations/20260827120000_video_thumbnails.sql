-- ============================================================================
-- 0015  Full-show video thumbnail.
-- Bunny Stream auto-generates a thumbnail per video, but the direct image URL
-- (https://{pull-zone}.b-cdn.net/{videoId}/{thumbnail-file}.jpg) isn't
-- derivable from the video ID alone — the pull-zone hostname and thumbnail
-- filename both vary. Admin-pasted, same pattern as performances.thumbnail_url
-- (already existed pre-Bunny). Streaming itself remains iframe-embed-only;
-- this is just a static poster image, not the video file.
-- ============================================================================
alter table public.show_videos add column if not exists full_show_thumbnail_url text;
