# Decisions

Key choices made during the build and the reasoning behind them. For the original product decisions (pricing model, invite-only, whole-show purchase, etc.), see `docs/Dance Show Platform - Master Brief.md` — this file covers decisions made *during implementation* that extend or reconcile that spec.

## Stale pre-shared-cookie sessions: auto-cleared via a raw `Set-Cookie` header

Introducing cross-subdomain cookie sharing (`lib/cookieDomain.ts`) created a real transitional bug: any session cookie set *before* that change (host-only, no `Domain` attribute) can sit alongside a new `Domain=.dancefilms.co.uk` cookie of the same name, and the browser may send the stale one — which the app doesn't recognise, silently bouncing an otherwise-correct sign-in back to the login page with no error shown (confirmed live: this is exactly what "admin login just refreshes" turned out to be — and, transitively, why branding image uploads got stuck on "Uploading…" forever too, since `uploadBrandingImage` hit the same broken-session `requireAdmin()` check mid-action).

First pass: relied on this self-resolving as old sessions got replaced, since Next.js's cookie APIs (Server Actions' `cookies()`, middleware's `NextResponse.cookies`) both de-dupe by name — a second `.set()` for the same cookie name silently replaces the first, so "set the new domain-wide cookie" and "clear the old host-only one" can't coexist through those APIs in one response. That wasn't good enough in practice — asking the admin to use a private window indefinitely isn't a real fix for daily use.

Actual fix, in `middleware.ts`: bypass the cookie-jar abstraction entirely and `response.headers.append("Set-Cookie", ...)` directly. `Set-Cookie` is one of the few headers the Fetch/HTTP spec explicitly carves out to always add a new header line on `.append()` rather than overwrite or comma-join — so a raw clearing directive (no `Domain` attribute, `Max-Age=0`) can coexist alongside the SDK's own domain-scoped `Set-Cookie` for the same name. Runs on every request when a `sb-`-prefixed cookie is present and cross-subdomain sharing is active, not just at sign-in, so it self-heals regardless of which request happens to carry the stale cookie. A no-op when no stale cookie exists, and inert on localhost (`domain` is only truthy on the real deployed domain).

Also hardened the two upload handlers (`BrandingForm`, `ShowEditor`) that hit this: neither had a `try/catch` around its server-action call, so any thrown error (a broken-session redirect, or anything else) left the button stuck showing "Uploading…" forever with no feedback. Both now reset their uploading state in a `finally` block regardless of outcome.

## Stripe: hosted Checkout, not the design's in-app card form

The Claude Design handoff mocked an in-app card-entry modal. We kept its visual shell (order summary) but the actual card entry happens on **Stripe's hosted Checkout page**, not a form we control. This is what the handoff's security rules require and keeps the app out of PCI scope — we never see raw card data.

## Video: iframe-only embeds, resolved on demand

Streaming uses a Bunny Stream iframe embed exclusively, never a direct file URL. Embed URLs are fetched by a server action **at play time**, re-checking the user's entitlement via RLS — the `bunny_video_id` never appears in page markup or the initial client payload. Context menu and text selection are disabled over the player.

This is explicitly a **deterrent**, not DRM — screen recording can't be stopped by any of this. Bunny's stronger options aren't wired up yet: Pull Zone referrer allowlisting (Bunny's rough equivalent of a domain lock — exact dashboard setting `Needs confirmation`), and **Token Authentication** (signed, time-limited embed URLs — a real feature to build, needing a shared signing key and server-side signing, not a setting to flip). See `lib/bunny.ts` for both. Originally built on Vimeo; switched to Bunny Stream (see "Switched from Vimeo to Bunny Stream" below) — the pattern itself (embed-only, resolved server-side, RLS-gated) carried over unchanged.

## Switched from Vimeo to Bunny Stream

The app never called Vimeo's API — it only ever stored an admin-entered video identifier and built an iframe embed URL from it (`lib/vimeo.ts`). Moving to Bunny Stream was therefore a like-for-like swap, not a re-architecture: `lib/bunny.ts` replaces `lib/vimeo.ts` with the same single-function shape, `performances.vimeo_id` / `show_videos.full_show_vimeo_id` were renamed (not migrated to new columns) since no real content had been loaded onto Vimeo yet, and every "Vimeo ID" admin field/label became "Bunny video ID". `download_url` (the full-show download field) didn't need to change — it was already host-agnostic, an admin-pasted URL to any hosted file.

## Download confirmation + tracking: full-show only, no live Bunny API

Full-show downloads get a confirmation modal (personal/family-use terms) before the link opens, and a "Downloaded" badge afterward — informational only, it never blocks re-downloading. Two scope calls made deliberately narrow, both confirmed with the school owner rather than assumed:

- **Full-show only, not per-performance.** Matches the existing V1 decision above ("Video: iframe-only embeds") that downloads are a DVD/USB replacement, not a per-dance feature. Adding per-performance downloads would mean a `download_url` on `performances` plus new admin UI — a real scope increase, not part of this change.
- **No live video-host API integration for temporary links.** Genuinely temporary, self-expiring download links need calling the video host's API at request time — this was written for Vimeo (`GET /videos/{id}` returns short-lived signed URLs, needing a Vimeo plan with API access) and the reasoning carries over unchanged now that the host is Bunny Stream, which has its own equivalent (Token Authentication, noted above) that isn't wired up either. Rather than build toward host API access that isn't confirmed to exist, the existing model stands: an admin-pasted `show_videos.download_url`, resolved server-side on demand and never placed in page markup. The confirmation modal's stated terms are the actual deterrent here, not a technical wall — consistent with the brief's own framing ("discourage casual sharing... not fight legitimate customers").

Download tracking lives in its own `downloads` table (user_id, show_id, unique together) rather than extending `entitlements`, since entitlements mean *ownership* and this means *usage history* — different concepts that shouldn't share a row. RLS lets a user insert their own row only for a show they already hold an entitlement for (reuses the existing `has_entitlement()` helper), so it can't be used to fake a "downloaded" badge for an unowned show.

## Access codes: an onboarding route, not a second auth system

A parent can now get in two ways: the normal invite-only magic link, or an "access code" for someone who isn't invited yet or can't get the magic-link email. Deliberately built as a thin layer over the *existing* invite/auth machinery rather than anything parallel:

- **Redemption ends exactly where a normal invite does.** Entering a valid code + email inserts a row into `invited_emails` (same table, same shape the admin's "Invited parents" screen already writes to) if one doesn't already exist, then calls the same `supabase.auth.signInWithOtp` the normal flow uses. From the next sign-in onward the account is indistinguishable from one invited the usual way — there's no separate "code user" state, no parallel session mechanism.
- **`access_codes` mirrors `invited_emails`'s security posture exactly**: RLS enabled, zero client policies, service-role only. A code is at least as sensitive as an email invite (it's a way *around* needing one), so the same "never RLS-scoped, always service role" rule applies.
- **Scoped to a school, optionally to a show.** `show_id` is nullable — a code can be school-wide or tied to one production. When set, it's used only to redirect the user to that show's page after sign-in (a nice-to-have); it does **not** grant an entitlement. Buying the show still goes through the normal checkout flow — the brief was explicit that the show should "appear in their account/library once they have completed the normal purchase flow," not before.
- **Codes are short and human-typeable** (8 chars, an alphabet excluding 0/O/1/I/L), generated with `crypto.randomInt` (not `Math.random()`) since this is the one thing standing in for an invite check. No rate-limiting was added on redemption attempts — a reasonable V1 gap, not addressed because it wasn't asked for.
- **One first-time-signup nuance**: if a code is tied to a specific show and the redeeming parent is brand new, the standard `/welcome` name-capture step still fires first (via the same `requireOnboardedProfile()` every page already uses) and redirects to `/shows` afterward, not the specific show. The "land on this show" nicety only applies cleanly to already-registered parents. Not worth extra plumbing to fix for a first-run-only edge case.

## Categories have a `kind` (group vs style)

The show page has two independent filter rows: class/age group (e.g. "Minis (3–5)") and dance style (e.g. "Ballet"). Rather than a second table, `categories` has a `kind` enum (`'group' | 'style'`). The admin's Performances screen has a select for each kind per dance.

## `service_role` needed explicit grants

Because Data API auto-expose is off (a deliberate security choice), every table needs explicit grants per role. Early on, `service_role` itself had no grants — this silently broke the invite-allowlist check, the Stripe webhook's entitlement insert, and admin reads, because all of those use the service-role client to bypass RLS intentionally. Fixed by granting `service_role` full privileges on the `public` schema (migration `20260724142008_service_role_grants.sql`). If a future admin/service-role query mysteriously returns nothing, check grants before assuming an RLS or logic bug.

## Full-show download is a separate, owner-gated feature

Parents can download the full show they own (replacing the old DVD/USB), independent of streaming. The download URL is admin-set (a Bunny Stream direct file URL, or any hosted file) and resolved on demand the same way the streaming embed is — entitlement-checked, never in markup. Per-dance downloads were considered but are **not** implemented — full-show only.

## Filters are dropdowns, not chip rows

The design's chip-row filters (group + style) got visually messy with real category counts (6 groups × 4 styles). Replaced with two `<select>` dropdowns that filter independently and together, with a "Clear filters" affordance. This is a deviation from the literal design handoff, made for real-content usability.

## Branding images are Storage uploads, not URL fields

Originally shipped as plain URL text fields (fastest to build). Replaced with real file uploads to a Supabase Storage `branding` bucket for logo (colour + white) and sign-in photo, matching how a non-technical school admin actually expects to set branding.

Show cover artwork followed the same path, later: a plain URL field at first ("upload support coming later" was literally the placeholder text), then a real upload to its own `artwork` bucket — kept separate from `branding` because it's per-show content, not the school's identity. Unlike `branding`, no broad `SELECT` policy was added on `storage.objects` for it: a public bucket already serves `getPublicUrl()` reads without one, and that policy only matters for `list()`/authenticated-path access, which this app never uses — unnecessary to replicate an already-flagged advisory (`branding`'s policy trips the "public bucket allows listing" lint) for a second bucket.

## Admin signs in with a password; parents keep magic links

Two different sign-in flows, deliberately:

- **Parents** — invite-only magic link. They visit once or twice a season; a
  password is friction they'd have forgotten by the next show, and it would mean
  building reset flows for non-technical users.
- **Admin** — email + password (`/admin/login`). Signing in frequently, from
  multiple devices, wanting a credential the browser/password manager can save.

Passwords didn't replace magic links because they wouldn't have removed the
email dependency anyway — verification and reset still need mail delivery.

A correct password alone isn't enough: the account must also be `is_admin`, or
the session is discarded immediately, so this page can't become a second
authentication route for parent accounts. Errors are deliberately generic
("Incorrect email or password") so the page doesn't disclose which emails exist.
The magic-link path still works for the admin email as a recovery route if the
password is lost.

## Dance Films' brand vs each school's brand

The admin manages every school, so it wears **Dance Films'** brand (Dance Films
Blue, pink accent, Montserrat) rather than whichever school is being edited.
Same for the apex holding page. Only the parent portal (`[data-app]`) takes its
colours and fonts from the school's saved theme.

Practically: `--df-blue` / `--df-pink` are fixed tokens no school theme can
override, and the admin skin remaps `--disp`/`--body` to Montserrat so existing
admin CSS picked up the brand font without every rule changing.

The holding page also moved out of the `(platform)` route group for this reason
— inside it, it inherited the school theming layer and fell back to Liberty's
palette on a page that is not Liberty's.

## Pink needed an accessibility tint on dark

Dance Films Pink on Dance Films Blue is 3.25:1 — it fails WCAG AA for normal
text, which matters because the design guide calls for pink on dark chrome. Dark
surfaces therefore use `#FF62B0` (5.35:1) for pink text and small pink elements,
recorded in `brand/DESIGN_GUIDE.md` as an accessibility tint rather than a new
brand colour. Full-strength pink is retained on white and in solid buttons,
where it measures 4.53:1.

## Local git history was rewritten once to remove a leaked secret

A Supabase personal access token and DB password were briefly committed inside `.claude/settings.local.json` (an AI-tool local config file that should never be tracked). GitHub's push protection caught it before it reached the remote. History was rewritten (`git filter-branch`) to remove the file from every commit, `.gitignore` was updated, and the push succeeded clean. **The exposed credentials should be rotated** regardless (see `SESSION_HANDOFF.md`).
