-- ============================================================================
-- 0008  Grant service_role full access to the public schema.
--
-- Data API auto-expose is OFF, so grants are explicit. service_role bypasses
-- RLS but still needs SQL privileges to reach tables via PostgREST. Every
-- server-side privileged path (invite-allowlist check, Stripe webhook, admin
-- reads/writes) uses the service role, so grant it broadly here — it is
-- server-only and never exposed to the browser.
-- ============================================================================
grant usage on schema public to service_role;
grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions  in schema public to service_role;

-- Future tables/sequences too.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;

notify pgrst, 'reload schema';
