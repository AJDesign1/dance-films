-- ============================================================================
-- 0009  Full-show download URL.
-- Owners can download their purchased show (DVD/USB replacement). The URL is
-- entitlement-gated (RLS on show_videos) and resolved on demand — never placed
-- in page markup. Source is admin-set: a Vimeo download link (paid plan) or any
-- hosted file. Streaming remains embed-only.
-- ============================================================================
alter table public.show_videos add column if not exists download_url text;
