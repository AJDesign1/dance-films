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

## Going live

- Deployed to Netlify on `dancefilms.co.uk`, with `liberty.dancefilms.co.uk` as the first live school subdomain
- Apex and unknown hosts no longer default to Liberty — they serve a holding page instead, reserved for the future marketing site
- Auth email moved to Resend SMTP, sending from `@dancefilms.co.uk` instead of Supabase's shared default sender
- Fixed the magic-link post-login redirect landing on the apex rather than the school's own subdomain (Netlify's runtime doesn't preserve the hostname in `request.url`)

## Dance Films brand

- Brand assets and design guide added to the repo (`brand/` sources, `public/brand/` web SVGs)
- Montserrat added; admin area and marketing pages now wear Dance Films' own brand (Blue `#232835`, Pink `#E5007E`) rather than a school's theme
- New password-based admin sign-in at `/admin/login`, separate from the parents' magic-link flow, with the master admin now reachable at `dancefilms.co.uk/admin`
- Apex holding page rebranded: stacked logo, signature gradient, strapline with "dance show" in pink
- Recorded an accessibility tint for pink on dark grounds in the design guide (full-strength pink fails AA at small sizes on the blue)

## Download protection

- Confirmation modal before a full-show download starts (personal/family-use terms), never shown for streaming
- "Downloaded" badge after a successful download — informational only, never blocks re-downloading
- New `downloads` table + RLS tracks this, separate from `entitlements` (ownership vs usage history)
- Kept the existing admin-pasted, server-resolved download URL rather than building toward live Vimeo API downloads — that needs Vimeo API access (Pro+, a Personal Access Token) that isn't confirmed to exist yet (see `DECISIONS.md`)

## Switched video host from Vimeo to Bunny Stream

- `lib/bunny.ts` replaces `lib/vimeo.ts` — same shape, different host, since the app never called Vimeo's API in the first place
- `performances.vimeo_id` → `bunny_video_id`, `show_videos.full_show_vimeo_id` → `full_show_bunny_video_id` (renamed, not migrated — no real content had been loaded onto Vimeo yet)
- Every "Vimeo ID" admin field, label and placeholder became "Bunny video ID"
- `next.config.ts`'s image allowlist swapped `i.vimeocdn.com` for `*.b-cdn.net`
- Missing `BUNNY_LIBRARY_ID` now degrades gracefully (logs an error, shows "No video available") instead of a hard 500 on every video click

## Show cover artwork upload

- Replaced the plain URL field on the show editor with a real file upload, matching the pattern already used for branding logos/photos
- New `artwork` Storage bucket, public, for cover images — kept separate from `branding` since it's per-show content, not the school's identity

## Access codes — alternative onboarding route

- New "Having trouble? Use an access code" link on the login screen (idle, sent, and not-invited states) opens a code → email flow
- Redeeming a valid code adds the parent to `invited_emails` (even if they weren't invited before) and sends the same magic link the normal flow uses — no parallel auth system, no new session mechanism
- A code can optionally be tied to a specific show, redirecting there after sign-in; it never grants an entitlement — purchasing still goes through the normal checkout
- New `access_codes` table, same security posture as `invited_emails` (RLS enabled, zero client policies, service-role only)
- Managed per-school at `/admin/{slug}/access-codes` — create, regenerate, disable/enable, change show association

## Show URL is now editable

- New "Show URL" field on the show editor (`/show/{slug}`) — previously fixed forever at creation, auto-derived from the title at the time
- Leave it blank and it still auto-derives from the title (same as before); type a specific one and it's validated as unique within the school, with a clear error if taken
- Warns that changing it breaks any existing link to the show

## Invited parents: payment status & cash-grant access

- Each parent now shows, per show, whether they've **Paid** (bought online by card) or **Cash** (access given manually) — read straight off `entitlements.source`
- A **Give access** button grants a show to a parent who paid in cash (only once they've signed in — an entitlement needs their account to attach to; not-yet-registered parents show a note instead)
- Reuses the existing grant/revoke actions from Users & access verbatim — no duplicated logic, no schema change
- Card ("Paid") entitlements aren't removable from this screen (avoids accidentally revoking a real payment); cash grants are

## Mobile fixes

- Login screen: the hero panel's logo and headline (both absolutely positioned) were sized for the full-height desktop panel; on mobile the panel shrinks to just its `min-height`, so the bottom-anchored headline overflowed upward past the top-left logo and off the page. Moved the hero styling into a CSS module (`LoginScreen.module.css`) and added a `max-width: 640px` breakpoint — taller `min-height`, smaller logo/headline/subtext — mirroring the pattern already used on the show page hero.
- Sign-out (`app/auth/signout/route.ts`) redirected to `new URL(request.url).origin` + `/login`, which on Netlify doesn't reliably preserve the subdomain — signing out of `liberty.dancefilms.co.uk` could land on the apex holding page instead of Liberty's own login. Same root cause as the earlier magic-link redirect bug; fixed the same way, by switching to the header-based `getOrigin()` helper.

## Admin sign-out, and the real cause of failing image uploads

- **Sign out** added to the admin — school admin sidebar and master admin sidebar. There was previously no way to sign out of the admin at all; only the parent portal had one
- `/auth/signout` now takes a return target so the admin lands on its own password sign-in rather than a school's parent magic-link screen. Matched against a fixed allowlist, since a redirect target read from a request body is an open redirect otherwise
- **Fixed image uploads failing for anything over 1MB.** Server Actions cap their request body at 1MB by default, but the upload actions advertised 2MB (branding/photos) and 5MB (show artwork). Files in between were rejected by the framework *before* the action ran, so the action threw instead of returning an error. Raised `experimental.serverActions.bodySizeLimit` to 8mb. Verified causally: with the setting removed a 1.5MB upload throws `Body exceeded 1 MB limit.`; with it, 1.5/3/5MB all reach the action
- This is the true root cause of the earlier "says uploading but doesn't" report. The try/catch added then stopped the button hanging forever, but the upload still failed for larger files — and the catch-all message ("try signing out and back in") pointed at the session, which sent debugging in the wrong direction. That message now names the size limit instead
- The same catch was also swallowing `redirect()` — so a genuinely expired session did nothing visible instead of returning to sign-in. Redirect errors are now re-thrown (`lib/uploads.ts`)
- Size limits moved into `lib/uploads.ts` and shared, so the client can reject an oversized file instantly rather than after a failed round-trip, and the client and server can't drift apart

## Editable school page content

- New **School page** admin screen (`/admin/{slug}/school-page`) — per-school copy and photos for the two content bands under the shows
- **About &lt;school&gt;**: new two-column band between the shows and the media team — copy left, photo right, heading auto-derived from the school name so it follows a rename
- **Meet the media team**: was hardcoded in the page component (and shipped a visible `[Placeholder — final copy to follow.]` to real customers) — now name, role, bio, highlight line and photo are all per-school
- Either band hides itself entirely when its fields are empty, so a new school never shows an empty section
- Seven new columns on `schools` rather than a new table — same shape as the logo/hero URLs already there, so no new RLS policies or grants were needed. Liberty's previously-hardcoded team copy is carried over by the migration (minus the placeholder marker) so its live page reads the same
- Reuses the existing `branding` bucket and `uploadBrandingImage` action with two new slots, rather than a parallel upload path
- Fixed a pre-existing contrast bug found while verifying this: the media-team band sits on the light `--paper` ground but inherited the dark theme's near-white text tokens — the highlight line was `#EAF0F4` on `#F5F1E8`, a 1.05:1 ratio (invisible), and the bio was ~2.4:1. The band now re-points its text tokens at ink-based values (16.2:1 and ~5.1:1, both passing AA)

## Site favicon

- Added the Dance Films icon (dark navy, pink gradient blob, wordmark) as the favicon across every page — parent portal, admin, and marketing alike
- Served as a static asset (`public/favicon.jpg`, referenced via `metadata.icons` in the root layout) rather than Next's `app/icon.*` file convention — that convention runs a build-time codegen step which embeds the project's absolute file path as a string, and this machine's folder name (`Alex's Projects`) has an apostrophe that broke it (`Unexpected token` on the unescaped `'`). The static-asset approach sidesteps that codegen entirely.

## Repo hygiene

- Connected the repository to GitHub (`AJDesign1/dance-films`)
- Discovered and removed a leaked Supabase access token + DB password from git history (rewrote history with `git filter-branch`, added `.claude/settings.local.json` to `.gitignore`)
- Added this shared documentation set (`README.md`, `CURRENT_STATE.md`, `DECISIONS.md`, `CHANGELOG.md`, `AI_INSTRUCTIONS.md`, `SESSION_HANDOFF.md`)
