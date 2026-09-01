# Session Handoff

What to pick up next. Update this file at the end of each working session so the next one (human or AI) doesn't have to reconstruct state from chat history.

## Immediate priorities

**Done since the last session**: dances can now be sections of the full-show
recording rather than separate uploads, and Bunny's own chapters fill the list
automatically; the performances screen saves explicitly; shows can be deleted;
posters are uploaded rather than pasted; images compress before upload.
`BUNNY_STREAM_API_KEY` is set locally and on Netlify.

1. **Load the rest of the real Liberty content**: remaining shows, categories,
   and the real parent email list, via `/admin/liberty`. Chapters and the first
   show's dances are in.
2. **Site speed still needs the Netlify plan decision.** Removing four database
   round trips took the authenticated show page from 1250-2000ms to
   ~950-1550ms, but an identical build serves it in ~250ms locally. The gap is
   that functions run in Ohio while Supabase is in London, and region selection
   is gated behind a plan upgrade ("upgrade to customize" in the UI). The
   alternative, if the upgrade isn't wanted, is collapsing the remaining
   per-page queries into a single Postgres function — one round trip instead of
   about four. Worth pricing one against the other.
3. **Decide on Bunny Token Authentication.** Referrer allowlisting is on, but
   it's deterrence only — a spoofed `Referer` still fetches the MP4, and always
   could (Bunny accepts its own player domain). Token Authentication is the only
   setting that would actually close that, and it's a real feature to build
   (signing key + server-side signing), not a toggle. See `DECISIONS.md`.

**Two things that bit during this work, both worth knowing:**

- **Bunny renames a video's thumbnail when you set a custom one.** A pasted
  thumbnail URL keeps returning 200 and keeps serving the *old* auto-generated
  frame, so it looks unchanged rather than broken. This is why posters are
  uploads now, not pasted URLs.
- **Netlify bakes environment variables in at build time.** Adding one does
  nothing to what's already deployed — it needs a redeploy. Cost an hour of
  "the API key is set but the app says it isn't".

**Heads up on email sending**: while testing the access-code flow today, a `signInWithOtp` call failed with `AuthRetryableFetchError` (HTTP 500) after several magic-link sends in quick succession — almost certainly a rate limit (either Resend's or Supabase Auth's own OTP-request throttle), not a code defect; an identical call had just succeeded moments before. Worth keeping in mind if testing hits an unexplained "Something went wrong" on the login screen — try again after a short pause before assuming it's a bug.

## Live infrastructure (done — for reference)

- **Netlify**: deployed, auto-deploys from `master` on push. Apex `dancefilms.co.uk` + `liberty.dancefilms.co.uk` both live with SSL.
- **Wildcard subdomains**: a `*` CNAME exists at SiteGround, but Netlify's plan wouldn't accept a `*.dancefilms.co.uk` alias (wildcard certs are a paid tier). **Each new school therefore needs its subdomain added manually** in Netlify → Domain management → Add domain alias.
- **Auth email**: Resend SMTP via Supabase, sending from `@dancefilms.co.uk` (domain verified, DKIM + SPF at SiteGround). Supabase Site URL is the apex, with `https://*.dancefilms.co.uk/**` allowed for redirects.

## Then

- **Stage 9/10 — Harden & test**: a proper RLS test sweep (confirm a non-entitled user genuinely cannot read another show's video refs via direct API calls, not just through the UI), a full mobile/tablet pass, and a reduced-motion/focus accessibility check. The responsive pass done so far was spot-checked, not exhaustive.
- Decide whether Bunny's Pull Zone referrer allowlisting and/or Token Authentication get set up — the code needs no further changes for referrer allowlisting, but Token Authentication (genuinely temporary signed URLs) would need a signing key + server-side signing logic, a real feature to build, not a setting to flip.

## Known non-blocking gaps

- **`BUNNY_LIBRARY_ID` went missing from local `.env.local` once**, mid-session,
  after having been added earlier — the file was back to its exact previous
  contents (it's gitignored, so not a git operation). Symptom is every video
  showing "No video available" locally while production is fine, with
  `BUNNY_LIBRARY_ID is not set` in the dev-server log. Check that first before
  debugging the player.

- No per-dance download (full-show only, by design — see `DECISIONS.md`)
- Marketing site / blog / SEO CMS: intentionally not built (V1 scope)
- No automated test suite exists yet (manual verification only, throughout the build)

## Not visually verified yet

The admin rebrand (Dance Films Blue / pink / Montserrat) was verified at token
and contrast level, and the sign-in and holding pages were screenshot-checked on
desktop and mobile — but the **authenticated admin screens** were not viewed
directly (no local admin session available at the time). Worth a look through
Branding / Shows / Performances after the password is set, in case any screen
carried a hard-coded colour the token remap didn't reach.

**Admin full-preview access** (shared session cookie across subdomains +
`is_admin` treated as owning every show) is also unverified end-to-end for the
same reason. After signing in fresh (existing sessions predate the shared
cookie — see below), click through Master admin → **View site** → a show →
play a performance, and confirm it doesn't ask for a magic link and the video
actually plays.

**Fixed: stale pre-shared-cookie session caused a silent sign-in loop (and
broke uploads too).** Symptom reported live: submitting the correct admin
password on `/admin/login` "just refreshes" — no error, bounces back to the
login page — and separately, uploading branding images got stuck on
"Uploading…" forever. Same root cause both times: a cookie set *before*
cross-subdomain sharing existed (host-only, no `Domain` attribute) sitting
alongside the new `Domain=.dancefilms.co.uk` cookie of the same name; the
browser can send the stale one, which the session logic doesn't recognise —
`requireAdmin()` then redirects (no error to show for the login case; for
uploads, the redirect happened *inside* the unguarded upload action, so the
button never reset).

First attempt asked the admin to use a private window as a one-time
workaround. That wasn't good enough for daily use, so it's now properly
fixed in code: `middleware.ts` clears the stale cookie via a raw
`Set-Cookie` header appended directly to the response (bypassing Next's
cookie APIs, which de-dupe by name and can't otherwise coexist a "set new" +
"clear old" for the same cookie name — see `DECISIONS.md`). Both upload
handlers (`BrandingForm`, `ShowEditor`) also now wrap their server-action
call in `try/catch`/`finally`, so any thrown error resets the uploading
state instead of hanging forever, regardless of cause.

**Should now just work** on the next sign-in / next upload attempt in a
normal (non-private) browser — worth confirming live, since the fix itself
was verified with `curl` (a fake stale cookie gets a clearing header; no
stale cookie or localhost both correctly no-op) but not against a real
browser session end-to-end.

**Bunny Stream switch + artwork upload** — verified by typecheck, production build, and visual checks of the admin UI (field labels, upload control) via a temporary preview route (removed before committing) — same auth limitation as above, no real admin session available. **Not verified**: an actual file upload writing to the new `artwork` bucket, and an actual video embed rendering (needs `BUNNY_LIBRARY_ID` set — see Immediate priorities — plus a real Bunny video ID pasted into a performance). Worth checking both once signed in: upload a show's cover artwork and confirm it appears on the shop card, and paste a real Bunny video ID into a performance and confirm it plays.

**Access codes** — the customer-facing redemption flow *was* verified live end-to-end against the real dev database: an invalid code is correctly rejected, a valid code (`TESTCODE`, inserted directly and removed afterward) correctly advances to the email step, and submitting an email correctly inserts an `invited_emails` row **even for an email with no prior invite** — the core requirement. The magic-link send itself hit the rate limit mentioned above partway through testing; the call is otherwise identical to the already-proven `requestMagicLink` path. **Not verified**: the admin CRUD actions (create/regenerate/disable/change show) against a real DB with a real admin session — checked visually only via a temporary preview with dummy data — and the "code tied to a specific show redirects there after sign-in" behaviour, which was reasoned through but never actually observed end-to-end.

## Dance clips — what was verified

Verified live against the real dev DB, signed in as admin: the migration
backfills correctly (5 dances with their own Bunny id → `standalone`, 2 empty
ones → `show`); the admin row swaps between a Bunny ID field and Start/End
fields with the source dropdown; `12:45`/`15:20` saves as 765/920 seconds with
the length derived to 2:35; an end before the start is rejected with an error
and not written; and opening a chapter dance resolves the **show's** video with
`t=765`, loads player.js, and still puts no video id in the markup before the
click. Typecheck and production build clean.

**Not verified — needs a human with a real browser**: that playback actually
seeks to the start and pauses at the end. The preview browser wouldn't start
playback (a scripted click doesn't satisfy the autoplay policy, and the pane's
renderer was failing), so the seek/stop path is the one thing exercised only by
reading the code. It's a few minutes' work to confirm: open a dance set to
"Show video" with start/end filled in, and check it starts in the right place
and stops rather than running into the next dance.

Also unverified: per-dance thumbnail **upload** (the control renders and the
action mirrors the proven `uploadShowArtwork` path, but no file was actually
pushed to the `artwork` bucket through it).

## Video thumbnails — what was verified

Verified live against the real dev DB, signed in as admin: the admin field
saves, the proxy route returns the image (200, WebP, ~79KB from a 6MB source),
the rendered `<img>` decodes to real content at 1600×897, an unauthenticated
request gets 404, and the `bunny_video_id` appears nowhere in the page markup.
Typecheck and production build both clean.

**Not verified**: the per-performance thumbnails (only the full-show one had a
URL to test with — the code path is identical, but no dance had a real
thumbnail URL pasted yet), and anything on the deployed site. Netlify needs no
new env var for this, but the first real check should be that `sharp` resolves
in the Netlify build — it's now an explicit dependency rather than the
transitive one Next was providing, which is the safer arrangement but a change
worth watching on the first deploy.

## Where things stand technically

See `CURRENT_STATE.md` for the full status table. Short version: the app is feature-complete for the Liberty V1 scope described in `docs/Dance Show Platform - Master Brief.md`, is deployed on the real domain, and is not yet receiving real traffic.
