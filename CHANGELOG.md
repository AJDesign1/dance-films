# Changelog

Human-readable build log, grouped by stage. For exact commits see `git log`.

## Foundation

- Initial commit: source docs (`docs/`) + Liberty brand assets
- Added the Claude Design handoff bundle (3 HTML/CSS/JS prototypes: customer platform, school admin, master admin)

## Stage 0 — Scaffold

Next.js 15 app, no Tailwind — CSS-variable token system ported from the design handoff instead. Supabase clients set up (browser/server/admin). Netlify config added.

## Stage 1 — Schema + RLS

Full schema as version-controlled migrations: schools, profiles, invited_emails, shows, show_videos, categories, performances, performance_categories, orders, entitlements. RLS enabled on every table. Liberty seeded with demo shows/performances/categories.

## Stage 2 — Subdomain theming

Middleware resolves the active school by subdomain; each school's `theme` jsonb is applied as CSS-variable overrides at runtime, so the same components render as any school's brand.

## Stage 3 — Auth

Invite-only magic-link login. The allowlist is checked server-side *before* an OTP is sent — a non-invited email never gets a link. Name capture on first sign-in.

## Stage 4 — Shows shop

Unified shop with real owned ("Watch") / not-owned ("Buy") states driven by entitlements.

## Stage 5 — Show page + video

Hero, gated full-show video, performance library with filters, viewing overlay with prev/next. Followed shortly by an anti-copy hardening pass (iframe-only embeds, on-demand URL resolution, context-menu/selection disabled).

## Stage 6 — Stripe

Hosted Checkout → signature-verified webhook → entitlement insert. (Keys not yet added — see `SESSION_HANDOFF.md`.)

## Stage 7 — School admin

Built in three slices: (1) shell + access management + a critical `service_role` grants fix, (2) content management (shows, performances, categories), (3) branding & config with live preview. Covers everything a school owner needs day to day.

## Stage 8 — Master admin

Schools list, Add school, Configure, enable/disable.

## Post-build polish

- Full-show download button (owner-gated, on-demand URL, admin-configurable)
- Show-page filter UX: group/style dropdowns replacing chip rows; more spacing above the performance list
- Show summary block, smaller performance titles, show-card title spacing
- Branding images (logo colour/white, sign-in photo) moved from URL fields to real Supabase Storage uploads
- Responsive review pass on mobile/tablet

## Repo hygiene

- Connected the repository to GitHub (`AJDesign1/dance-films`)
- Discovered and removed a leaked Supabase access token + DB password from git history (rewrote history with `git filter-branch`, added `.claude/settings.local.json` to `.gitignore`)
- Added this shared documentation set (`README.md`, `CURRENT_STATE.md`, `DECISIONS.md`, `CHANGELOG.md`, `AI_INSTRUCTIONS.md`, `SESSION_HANDOFF.md`)
