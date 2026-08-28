# Decisions

Key choices made during the build and the reasoning behind them. For the original product decisions (pricing model, invite-only, whole-show purchase, etc.), see `docs/Dance Show Platform - Master Brief.md` — this file covers decisions made *during implementation* that extend or reconcile that spec.

## Show URL is now editable, not fixed at creation

`shows.slug` was set once at creation (auto-derived from the title, silently de-duped with a `-2` suffix if taken) and never editable — a problem once a show gets renamed and the URL no longer matches. Now exposed as a "Show URL" field in `ShowEditor`:

- **Leave it blank → same as before**: auto-derived from the title, quietly de-duped.
- **Type a specific URL → respected exactly**, or rejected with a clear error naming the conflict if another show in the school already has it. Silent auto-suffixing only happens for the blank/auto-derive path — once an admin is deliberately choosing a URL, changing it behind their back would be confusing.
- **Client-side sanitisation matches the server's `slugify()` exactly** (same regex, collapsing any run of non-alphanumeric characters to a single hyphen) so what's shown while typing matches what actually saves — the first version only *stripped* invalid characters instead of hyphenating them, which silently glued words together (`"New Show"` → `"newshow"` instead of `"new-show"`) until caught in testing.
- **No redirect/alias for the old URL** — changing it breaks any existing link to the show (shared, bookmarked, printed). Flagged in the UI ("any link to the old one will stop working") rather than built around, since tracking old slugs would need a new table for a scenario that's rare in practice (rename shows, not swap them repeatedly).

## Payment visibility + cash-grant on the Invited parents page

The school owner wanted, on the parents page, to see who's paid for what and to grant access to parents who paid cash. Built by reusing existing concepts rather than anything new:

- **"Paid" vs "Cash" is read straight off `entitlements.source`** — `'purchase'` (written by the Stripe webhook) shows as **Paid**, `'granted'` (written by a manual admin grant) shows as **Cash**. No new "payment" table; the source column already carried this distinction.
- **Grant/revoke reuses the existing `grantEntitlement`/`revokeEntitlement` actions** (from the Users & access page) verbatim — grant already writes `source: 'granted'`, which is exactly "cash/comp access". Those two actions just gained a second `revalidatePath` for the parents page so both screens stay fresh. No duplicated entitlement-write logic.
- **Grant is only possible once a parent has signed in.** An entitlement's `user_id` FK points at a `profiles` row, which only exists after first sign-in — so a not-yet-registered invite literally has nothing to attach an entitlement to. Rather than build a parallel "pending grant keyed by email, reconciled on signup" mechanism (a real schema + trigger change — offered to the owner, declined), the UI shows "Access can be given once this parent signs in" for those rows. The realistic cash flow still works: add the parent → they sign in from the invite → then grant.
- **Card-paid ("Paid") entitlements have no Remove button here; cash ones do.** Deliberate footgun-avoidance: revoking a real Stripe payment shouldn't be a stray click on a payment-overview screen. The full grant/revoke-anything control still lives on the Users & access page (and refunds go through Stripe regardless). Cash grants, being the thing you gave manually, are freely removable here.

This overlaps the existing Users & access page (which lists registered users and toggles entitlements). Both were kept: Users & access is the per-user access matrix; the parents page is the invite-list-plus-payment view the owner actually asked to work from. Same underlying actions, two lenses.

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

## School page content lives on `schools`, not a new table

The "About &lt;school&gt;" and "Meet the media team" bands are one row's worth of
copy plus two image URLs per school — exactly the shape of the `logo_*_url` /
`hero_image_url` columns already on `schools`. Seven nullable columns there beat
a `school_page_content` table with a 1:1 FK: no join on the hot shop-page read,
and no new RLS policies or grants, since the existing row-level policies and
table-level grants on `schools` already cover every column.

Null means "hide the band" rather than "show an empty box". That keeps a brand
new school looking finished before its owner has written anything, and means
clearing a field is how you remove a section — no separate visibility toggle to
keep in sync with the content.

The About heading is derived (`About {school.name}`) rather than stored, so it
can't drift out of sync after a school is renamed. The trade-off is that a
school can't title that section anything else; if one ever needs to, it becomes
an optional override column rather than a rewrite.

## The media-team band overrides its inherited text tokens

That band is the one place in the parent portal that sits on the light `--paper`
ground regardless of the school's chosen theme. Under a dark theme it inherited
near-white text tokens onto cream — `#EAF0F4` on `#F5F1E8` is 1.05:1, i.e.
genuinely invisible, which is how it shipped until the content became editable
and the highlight line stopped rendering visibly.

Rather than hard-coding colours on each element, `.team` re-points `--text`,
`--text-2` and `--border` at `--ink`-derived values, so every descendant —
including the pre-existing inline styles — inherits something legible under
either theme. The accent-coloured eyebrow label was left alone: teal-on-cream is
low contrast too, but changing how a school's accent renders is a brand decision
rather than a bug fix.

## Upload limits live in one place, above the Server Action body cap

Server Actions cap their request body at 1MB by default. The upload actions
advertised 2MB and 5MB, so files between the two were rejected by the framework
before the action ran — the action *threw* rather than returning `{ error }`,
which is a different failure path than the size check inside it.

Two lessons baked into the code:

1. `experimental.serverActions.bodySizeLimit` must stay above the largest limit
   any upload action advertises. `lib/uploads.ts` says so next to the constants,
   because the two numbers are only correct relative to each other.
2. A blanket `catch` around a server action is a trap. It swallowed both the
   body-size rejection *and* `redirect()`, so an expired session silently did
   nothing, and the generic "try signing out and back in" message actively
   misdirected diagnosis for weeks. Redirect errors are re-thrown, and the
   fallback message names the likeliest real cause (file size) instead of
   guessing at the session.

The client forms check the same shared constants before sending. That's a
courtesy for fast, accurate feedback — the server still enforces them, since a
client check gates nothing.

## Signing out needs to know which sign-in to return to

Parents and the admin have deliberately different sign-in screens (invite-only
magic link vs email + password). One sign-out route serves both, so it takes the
return target from the form — matched against a two-entry allowlist rather than
trusted, because a redirect target read from a request body is an open redirect.

It also resolves the origin from headers rather than `request.url`, the same fix
the magic-link callbacks needed: Netlify's runtime doesn't reliably preserve the
hostname, which would bounce a school subdomain to the apex on sign-out.

## Images go through next/image, and uploads set their own cache header

Two separate problems, measured on the live site rather than guessed at:

1. The originals are full-resolution camera files. The About and media-team
   photos were 1.8MB each — 2048px wide, displayed at about 550px — and the
   media-team one was a PNG of a photograph, the worst possible format for it.
2. Supabase Storage serves objects with `Cache-Control: no-cache` unless the
   upload says otherwise. Every image was therefore re-downloaded on every page
   view and every client-side navigation.

`next/image` fixes both at once: the optimizer fetches each original once,
resizes it to the size actually rendered, re-encodes to WebP, and serves the
result from the CDN with a long-lived cache. That's why converting the markup
mattered more than re-encoding the stored files — end users stop touching the
originals at all. Uploads also now set a one-year `cacheControl`, which is safe
because upload paths carry a UUID, so replacing an image produces a new URL
rather than needing the old one invalidated.

`sizes` is a required prop on the `CoverImage` wrapper rather than optional.
Without it Next assumes `100vw`, which quietly defeats the point for a grid card
or a 150px thumbnail — the failure is invisible in review and only shows up as
bytes on the wire.

SVG logos stay as plain `<img>`. They're 7KB, there's nothing to optimise, and
routing them through the optimizer would mean enabling `dangerouslyAllowSVG` —
a real security trade-off for zero gain.

## Independent reads on a page run concurrently

Page loads were making avoidable sequential round trips: `/show/[slug]` awaited
the video row, the download flag, performances and categories one after another
even though none depends on the others, and `/shows` re-read the entire `shows`
table a second time purely to map entitlement IDs back to slugs. Selecting `id`
in the first query deleted that second read outright; the rest became a single
`Promise.all`.

Worth stating because it's the easy thing to get wrong when adding a feature:
a new `await` on a page is a new serial round trip unless it's deliberately
grouped with the others.

## Video poster frames are proxied, not linked

Performances and the full-show button now show the video's own still frame
instead of a flat gradient. Bunny generates one per video automatically; the
work was all on our side, and it landed as a route (`/api/thumbnail/{kind}/{id}`)
rather than an `<img src="…b-cdn.net…">` for one reason that only became
obvious on inspection: **a Bunny thumbnail URL contains the `bunny_video_id`**.
Rendering it directly would have published that id into the markup of every
show page — precisely what the anti-copy rule in `AI_INSTRUCTIONS.md` forbids,
and not fixed by `next/image` either, since that puts the same URL in a query
parameter. The proxy keeps the id server-side; the client only ever sees a row
id it already has.

The route re-checks entitlement the same way `getEmbedUrl` does (the select
runs as the caller under RLS, so a guessed id returns nothing), and its
`Cache-Control` is `private` — these responses are per-user gated, so a shared
CDN must never hold one and hand it to somebody who doesn't own the show.

Two things had to be true for this to work at all:

- **The URL is admin-pasted, not derived.** `https://{pull-zone}.b-cdn.net/{videoId}/{file}.jpg`
  needs a pull-zone hostname and a per-video thumbnail filename, neither of
  which follows from the library id. So it's a field on the Performances screen
  (and a new `show_videos.full_show_thumbnail_url` column), copied from Bunny's
  dashboard — same shape as `download_url`. `performances.thumbnail_url` already
  existed from the pre-Bunny schema and had simply never been reachable: it was
  read and rendered, but no admin UI ever set it.
- **Bunny's Pull Zone had to allow us as a referrer.** "Block direct url file
  access" was on with an empty allowed-domains list, which 403s everything
  including thumbnails. `dancefilms.co.uk` and `*.dancefilms.co.uk` are now on
  the allowed list, and the route sends a matching `Referer` header — necessary
  because *any* server-side fetch sends none, which is exactly why `next/image`
  could not have loaded these even setting the id leak aside.

**What that allowlist does and does not buy.** Measured, not assumed: with no
referrer the MP4 is 403; with `dancefilms.co.uk` it is downloadable; and with
`iframe.mediadelivery.net` it was *already* downloadable before any of this,
because Bunny accepts its own player domain. So referrer allowlisting is
hotlink deterrence, not access control, and adding our domain opened nothing
that a spoofed header couldn't already reach. The real boundary remains the one
that was always doing the work: a non-entitled user never obtains the video id,
so there is nothing for them to request. Consistent with "a deterrent, not DRM"
above — Token Authentication is still the only thing that would change that,
and is still not wired up.

Sizing is done in the route with `sharp`, which is why it's now an explicit
dependency rather than the transitive one Next was already pulling in. Bunny
returns the frame at capture resolution — the first real upload was 3818px wide
and **6MB** — and Bunny Optimizer (edge `?width=`) is not enabled on this
account, so the params are ignored. Resizing to the width each surface actually
renders, as WebP, takes that to ~79KB. Without it this feature would have
re-introduced, on the one page parents spend their time, exactly the problem
"Images go through next/image" above was written to solve.

## The school pages are deliberately not CDN-cached

Tempting, since every page is server-rendered on demand, but rejected:

`/shows` and `/show/[slug]` render per-user state — owned vs buy, the signed-in
name, the "Downloaded" badge. Netlify's cache key covers query and a few Next
headers, **not** the Supabase session cookie, so a cached copy would be shared
across users and hand one parent another's entitlement state. That's a data leak,
not a stale-content annoyance, and no TTL makes it acceptable.

`/login` is the one page with no user data in it, so caching it would be safe
content-wise. It's still not cached, for two weaker reasons: it reads cookies to
bounce already-signed-in visitors to `/shows`, and that redirect would stop
working once the response is shared; and the runtime bundles routes into one
function, so a cached `/login` defers the cold start to `/shows` rather than
removing it.

The measurement is what settled it. With DNS excluded, a request after ~25
minutes idle was 1.2s and warm requests ~0.5s — not the 9.3s first recorded,
which was inflated by a 3.1s local DNS lookup. If cold starts ever do become the
dominant cost, the honest fix is keeping the function warm or moving hosting
tier, not caching authenticated HTML.

## `auth.getUser()` is a network call, so it gets cached per request

Supabase's `getUser()` validates the token against the Auth server rather than
decoding the cookie locally — that's exactly why it's the trustworthy choice over
`getSession()`, and also why it costs a round trip. It was being paid twice per
signed-in page load: once in middleware refreshing the session, once in the page
via `getProfile()`.

Two changes, both preserving the same trust model:

1. `getUser`/`getProfile` are wrapped in React `cache()`, and `getProfile` calls
   `getUser()` instead of re-validating the token itself. Nothing is trusted that
   wasn't before; the same validated result is just reused within one request.
2. Middleware skips the refresh when no `sb-*` cookie exists. Sessions live
   entirely in cookies, so with none present there is nothing to refresh and the
   call could only ever return null.

The second one matters most for signed-out traffic — the login page every parent
loads first now reaches Supabase for the school row only, not for auth as well.
