# Session Handoff

What to pick up next. Update this file at the end of each working session so the next one (human or AI) doesn't have to reconstruct state from chat history.

## Immediate priorities

1. **Set `BUNNY_LIBRARY_ID`** (local `.env.local` and Netlify env vars) — the video library ID from the Bunny Stream dashboard. Without it, every video click server-logs an error and gracefully shows "No video available" rather than crashing — but no video plays anywhere until it's set. This is new since the Vimeo → Bunny Stream switch (see `DECISIONS.md`).
2. **Set the admin password.** `/admin/login` (password sign-in) is built, but the
   admin account has no password yet — set one in **Supabase Dashboard →
   Authentication → Users → [the admin user] → Reset/set password**. Until then,
   sign in via the magic-link fallback at `/login` on the apex domain.
3. **Rotate the leaked Supabase credentials.** A personal access token and DB password were briefly committed to git history and have been scrubbed, but should be treated as compromised: revoke/regenerate the access token in the Supabase dashboard, and reset the database password. — `Needs confirmation`: whether this has been done yet.
4. **Add Stripe keys** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) so the checkout → webhook → entitlement flow can be tested with real (test-mode) payments.
5. **Load real Liberty content**: actual shows, performances (with real Bunny video IDs), categories, and the real parent email list, via the school admin (`/admin/liberty`). The current DB rows are demo seed data.

**Heads up on email sending**: while testing the access-code flow today, a `signInWithOtp` call failed with `AuthRetryableFetchError` (HTTP 500) after several magic-link sends in quick succession — almost certainly a rate limit (either Resend's or Supabase Auth's own OTP-request throttle), not a code defect; an identical call had just succeeded moments before. Worth keeping in mind if testing hits an unexplained "Something went wrong" on the login screen — try again after a short pause before assuming it's a bug.

## Live infrastructure (done — for reference)

- **Netlify**: deployed, auto-deploys from `master` on push. Apex `dancefilms.co.uk` + `liberty.dancefilms.co.uk` both live with SSL.
- **Wildcard subdomains**: a `*` CNAME exists at SiteGround, but Netlify's plan wouldn't accept a `*.dancefilms.co.uk` alias (wildcard certs are a paid tier). **Each new school therefore needs its subdomain added manually** in Netlify → Domain management → Add domain alias.
- **Auth email**: Resend SMTP via Supabase, sending from `@dancefilms.co.uk` (domain verified, DKIM + SPF at SiteGround). Supabase Site URL is the apex, with `https://*.dancefilms.co.uk/**` allowed for redirects.

## Then

- **Stage 9/10 — Harden & test**: a proper RLS test sweep (confirm a non-entitled user genuinely cannot read another show's video refs via direct API calls, not just through the UI), a full mobile/tablet pass, and a reduced-motion/focus accessibility check. The responsive pass done so far was spot-checked, not exhaustive.
- Decide whether Bunny's Pull Zone referrer allowlisting and/or Token Authentication get set up — the code needs no further changes for referrer allowlisting, but Token Authentication (genuinely temporary signed URLs) would need a signing key + server-side signing logic, a real feature to build, not a setting to flip.

## Known non-blocking gaps

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

## Where things stand technically

See `CURRENT_STATE.md` for the full status table. Short version: the app is feature-complete for the Liberty V1 scope described in `docs/Dance Show Platform - Master Brief.md`, is deployed on the real domain, and is not yet receiving real traffic.
