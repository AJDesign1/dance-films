# Instructions for AI agents working in this repo

Read this before making changes. It supplements — doesn't replace — the original spec in `docs/`.

## Non-negotiables (from the original handoff, still in force)

1. **Preserve the design.** The UI came from a Claude Design handoff (`design/project/*.dc.html`). Wire up functionality; don't restyle finished screens. New connected states (empty/error/loading, admin) should match the existing look and use the token system, not new hard-coded values.
2. **Everything themeable via CSS-variable tokens.** No hard-coded colours/fonts/radii/spacing. A school's branding lives in `schools.theme` (jsonb) and is applied at runtime — see `lib/theme.ts` and `app/(platform)/layout.tsx`.
3. **Two brands, kept separate.** The parent portal (`[data-app]`) wears the *school's* brand. The admin area (`[data-admin]`) and marketing/holding pages (`[data-brand]`) wear *Dance Films'* own brand — read `brand/DESIGN_GUIDE.md` before touching either. A school theme must never restyle Dance Films' chrome, and don't put Dance Films pages inside the `(platform)` route group (they'd inherit the school theming layer).
4. **Never expose the Supabase service-role key or Stripe secret to the browser.** Privileged operations (webhooks, allowlist checks, admin writes) run server-side only, via `lib/supabase/admin.ts` (marked `server-only`).
5. **Access is enforced by RLS, not the UI.** Every table has RLS enabled. If you add a table, add RLS policies in the same migration — don't rely on the app hiding a button.
6. **Video/photos are never served by the app.** Vimeo hosts video (iframe embed only, never a file URL); images go through Supabase Storage.

## Schema changes

- Schema lives as **version-controlled migration files** in `supabase/migrations/`, named `<timestamp>_<description>.sql`. This is the source of truth for the database — never hand-edit the schema directly and let it drift from the repo.
- Data API auto-expose is **off** — every table the app needs from the client (`anon`/`authenticated`) needs explicit `grant` statements in its migration, and RLS policies to actually gate access.
- `service_role` needs its own explicit grants too (see `20260724142008_service_role_grants.sql`). If a service-role query returns nothing unexpectedly, check grants before assuming a logic bug.
- After a migration, regenerate types: `npm run types` (writes `lib/supabase/database.types.ts`).

## Video anti-copy pattern

When adding any new video-adjacent feature (new player surface, another download type, etc.), follow the existing pattern in `app/(platform)/show/[slug]/embed-actions.ts`:
- Resolve the Vimeo id / file URL via a **server action**, gated by the same entitlement check RLS already enforces.
- Never put a `vimeo_id` or file URL in page markup, props passed at initial render, or client-side state before the user actively requests playback/download.
- Don't add features that require a direct video-file URL — iframe embed only.

## Local dev

- `npm run dev` and `npm run build` **share `.next`** — running one while the other is active corrupts the cache (manifests as `Cannot find module './vendor-chunks/...'`). If that happens: stop both, `rm -rf .next`, restart.
- Magic-link email isn't configured for local testing. To get a session without email, mint a link via the Supabase Auth admin API (`POST /auth/v1/admin/generate_link`, service-role key) and hit `/auth/confirm?token_hash=...&type=magiclink`.
- The admin is gated on `profiles.is_admin`; only the account configured in the `handle_new_user` trigger gets it automatically (see `supabase/migrations/20260723142003_auth_trigger.sql`).

## Secrets

- `.env.local` is gitignored; never commit real keys. `.env.example` lists variable names only.
- `.claude/settings.local.json` (or equivalent local AI-tool config) must **never** be committed — it can accumulate literal secrets from allow-listed commands. It's gitignored; keep it that way.
- If you ever see a real secret in a diff you're about to commit, stop and flag it — don't rely on push protection to catch it after the fact.

## Scope discipline

- Marketing site (`dancefilms.co.uk`), photo galleries, per-dance downloads, and PayPal are explicitly **out of scope for V1** (see Master Brief). Don't build toward them unless asked.
- Don't refactor working code as a side effect of an unrelated task.
