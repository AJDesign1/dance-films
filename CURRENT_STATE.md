# Current State

Snapshot of what's built vs outstanding, as of the latest commit. Treat the codebase as ground truth if this drifts.

## Done

| Area | Status |
|---|---|
| Schema + RLS | ✅ 10 migrations applied (`supabase/migrations/`), RLS enabled on every table, `service_role` granted project-wide |
| Subdomain theming | ✅ Middleware resolves school by subdomain/`?school=`; DB `theme` jsonb → CSS variables at runtime |
| Auth | ✅ Invite-only magic link (allowlist checked server-side before OTP send); name capture on first sign-in; admin flag auto-set for the configured admin email |
| Shows shop | ✅ Unified shop, owned ("Watch") / not-owned ("Buy") from real entitlements |
| Show page + video | ✅ Hero, gated full-show + performance library, group/style filter dropdowns, viewing overlay with prev/next |
| Video anti-copy | ✅ Iframe-only embeds, embed URLs resolved on demand (never in page markup), context-menu/selection disabled. Real lock (domain-restricted embed) is a Vimeo account setting for later, no code change needed |
| Stripe | ✅ Hosted Checkout → webhook → entitlement, wired end-to-end. **No live/test keys added yet** — needs `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| School admin | ✅ Branding (colours/font/theme + live preview), Shows (list+editor), Performances (Vimeo refs, bulk add, group/style tagging), Categories, Invited parents (add/CSV), Users & access (grant/revoke) |
| Image uploads | ✅ Logo (colour + white) and sign-in photo upload to Supabase Storage (`branding` bucket) — no more URL-only fields |
| Master admin | ✅ Schools list, Add school, Configure, enable/disable. Marketing/Blog/SEO deferred (by design — see Master Brief) |
| Download button | ✅ Full-show download, owner-only, resolved on demand, admin-set URL |
| Responsive pass | ✅ Mobile/tablet checked with real screenshots; show-card and performance-title spacing tuned |
| Git hygiene | ✅ GitHub connected (`AJDesign1/dance-films`); a leaked Supabase PAT + DB password were scrubbed from history (`filter-branch`) — **rotate that token/password if not already done** |
| Hosting | ✅ Live on Netlify at `dancefilms.co.uk`, auto-deploying from `master`. `liberty.dancefilms.co.uk` live with SSL. New schools need their subdomain added manually in Netlify (plan doesn't allow a wildcard alias) |
| Auth email | ✅ Resend SMTP through Supabase, sending from `@dancefilms.co.uk` (DKIM + SPF verified) |
| Tenant routing | ✅ Apex/unknown hosts serve a Dance Films holding page instead of defaulting to Liberty; school resolution is subdomain-only (`?school=` still works as a preview override) |
| Dance Films brand | ✅ Assets + design guide in-repo; Montserrat, Blue `#232835` / Pink `#E5007E` applied to the admin area, admin sign-in and holding page. Contrast checked against WCAG AA (pink needed a lighter tint on dark — see `DECISIONS.md`) |
| Admin sign-in | ✅ Password login at `/admin/login`, `is_admin`-gated, reachable at `dancefilms.co.uk/admin`. **No password set on the admin account yet** — see `SESSION_HANDOFF.md` |

## Not done / deferred

- **Stage 9/10 (harden & test)** — no formal RLS test sweep, mobile/tablet review was ad hoc (not exhaustive), no accessibility (reduced-motion/focus) audit yet
- **Real content** — shows/performances/categories/parents in the DB are demo seed data; real Liberty content (shows, Vimeo IDs, parent list) hasn't been loaded
- **Authenticated admin screens not visually re-checked** after the brand change — tokens and contrast were verified, but the individual admin pages weren't viewed (no local admin session at the time)
- **Marketing site** (`dancefilms.co.uk`) — explicitly out of scope for V1, architecture allows it later
- **Photo galleries, per-dance download, PayPal** — explicitly out of scope for V1

## Needs confirmation

- Whether the leaked Supabase access token / DB password have actually been rotated yet
- Real Vimeo account tier/timeline for enabling domain-restricted embeds
