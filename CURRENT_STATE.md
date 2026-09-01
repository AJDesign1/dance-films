# Current State

Snapshot of what's built vs outstanding, as of the latest commit. Treat the codebase as ground truth if this drifts.

## Done

| Area | Status |
|---|---|
| Schema + RLS | ✅ 14 migrations applied (`supabase/migrations/`), RLS enabled on every table, `service_role` granted project-wide |
| Subdomain theming | ✅ Middleware resolves school by subdomain/`?school=`; DB `theme` jsonb → CSS variables at runtime |
| Auth | ✅ Invite-only magic link (allowlist checked server-side before OTP send); name capture on first sign-in; admin flag auto-set for the configured admin email |
| Shows shop | ✅ Unified shop, owned ("Watch") / not-owned ("Buy") from real entitlements |
| Show page + video | ✅ Hero, gated full-show + performance library, group/style filter dropdowns, viewing overlay with prev/next |
| Video anti-copy | ✅ Bunny Stream iframe-only embeds, embed URLs resolved on demand (never in page markup), context-menu/selection disabled. Pull Zone referrer allowlisting now on (`dancefilms.co.uk` + wildcard). Token Authentication still not wired up — see `DECISIONS.md` |
| Dance clips | ✅ A dance can play a section of the show's own recording (`video_source='show'` + start/end) instead of its own upload — one upload per show. Standalone per-dance videos still fully supported and unchanged. Seek/stop via Bunny player.js — see `DECISIONS.md` |
| Chapter import | ✅ "Import from Bunny" on the performances screen reads the show video's chapters (title + start/end, already in seconds) and creates a dance for each. Previews first; matches on start second so re-importing adds only what's new and leaves edited titles alone. Needs `BUNNY_STREAM_API_KEY` (read-only is enough) |
| Explicit save | ✅ The performances screen buffers edits behind a Save button with an unsaved-changes marker, rather than writing on every field blur. Add/delete/reorder still act immediately and flush pending edits first |
| Delete + confirmations | ✅ Shows can be deleted; school and show deletes use one designed dialog that lists consequences and requires typing the name. A show with orders is refused (payment records don't cascade) with a pointer to Draft instead |
| Poster images | ✅ Uploaded through the admin, not pasted URLs — Bunny renames a video's thumbnail when a custom one is set, so a pasted URL silently keeps serving the old frame. Served via `/api/thumbnail`, which accepts both Storage and Bunny sources |
| Image compression | ✅ All six admin upload points resize in the browser first (max 2000px, WebP). An 8.6MB 4000px PNG becomes ~123KB — and uploads that previously exceeded the limit now succeed. SVG and GIF deliberately excluded |
| Stripe | ✅ Hosted Checkout → webhook → entitlement, wired end-to-end. Keys are set in Netlify; not in local `.env.local`, so local checkout reports "Payments aren't configured yet" |
| School admin | ✅ Branding (colours/font/theme + live preview), Shows (list+editor, cover artwork upload), Performances (Bunny video IDs, bulk add, group/style tagging), Categories, Invited parents (add/CSV + per-show payment status & cash-grant access), Access codes, Users & access (grant/revoke) |
| Image uploads | ✅ Logo (colour + white) and sign-in photo upload to Supabase Storage (`branding` bucket); show cover artwork upload (`artwork` bucket) — no more URL-only fields |
| Master admin | ✅ Schools list, Add school, Configure, enable/disable. Marketing/Blog/SEO deferred (by design — see Master Brief) |
| Download button | ✅ Full-show download, owner-only, resolved on demand, admin-set URL. Confirmation modal (personal/family-use terms) before the link opens; "Downloaded" badge afterward, informational only — never blocks re-downloading. `downloads` table tracks this, separate from `entitlements` |
| Responsive pass | ✅ Mobile/tablet checked with real screenshots; show-card and performance-title spacing tuned |
| Git hygiene | ✅ GitHub connected (`AJDesign1/dance-films`); a leaked Supabase PAT + DB password were scrubbed from history (`filter-branch`) — **rotate that token/password if not already done** |
| Hosting | ✅ Live on Netlify at `dancefilms.co.uk`, auto-deploying from `master`. `liberty.dancefilms.co.uk` live with SSL. New schools need their subdomain added manually in Netlify (plan doesn't allow a wildcard alias) |
| Auth email | ✅ Resend SMTP through Supabase, sending from `@dancefilms.co.uk` (DKIM + SPF verified) |
| Tenant routing | ✅ Apex/unknown hosts serve a Dance Films holding page instead of defaulting to Liberty; school resolution is subdomain-only (`?school=` still works as a preview override) |
| Dance Films brand | ✅ Assets + design guide in-repo; Montserrat, Blue `#232835` / Pink `#E5007E` applied to the admin area, admin sign-in and holding page. Contrast checked against WCAG AA (pink needed a lighter tint on dark — see `DECISIONS.md`) |
| Admin sign-in | ✅ Password login at `/admin/login`, `is_admin`-gated, reachable at `dancefilms.co.uk/admin`. Password is set. |
| Access codes | ✅ Alternative onboarding route on the login screen ("Having trouble? Use an access code") — redeeming adds the parent to `invited_emails` and sends a normal magic link, no separate auth system. Managed per-school (create/regenerate/disable/school-or-show-scope) at `/admin/{slug}/access-codes` |

## Not done / deferred

- **Stage 9/10 (harden & test)** — no formal RLS test sweep, mobile/tablet review was ad hoc (not exhaustive), no accessibility (reduced-motion/focus) audit yet
- **Real content** — partly loaded: the Summer Showcase full-show video and its chapters are in. Remaining shows, categories and the real parent list still to come
- **Authenticated admin screens not visually re-checked** after the brand change — tokens and contrast were verified, but the individual admin pages weren't viewed (no local admin session at the time)
- **Marketing site** (`dancefilms.co.uk`) — explicitly out of scope for V1, architecture allows it later
- **Photo galleries, per-dance download, PayPal** — explicitly out of scope for V1

## Needs confirmation

- Whether Bunny's Token Authentication will be set up (signed, time-limited URLs — the only option that would genuinely stop a direct file fetch; referrer allowlisting, now on, is deterrence only — see `DECISIONS.md`)

Resolved since last update: `BUNNY_LIBRARY_ID` is set (local + Netlify) and video streams; Stripe keys are in Netlify (still commented out in local `.env.local`, so local checkout shows "Payments aren't configured yet"); the admin password is set; the leaked Supabase token/DB password have been rotated.
