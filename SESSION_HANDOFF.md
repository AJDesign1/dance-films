# Session Handoff

What to pick up next. Update this file at the end of each working session so the next one (human or AI) doesn't have to reconstruct state from chat history.

## Immediate priorities

1. **Set the admin password.** `/admin/login` (password sign-in) is built, but the
   admin account has no password yet — set one in **Supabase Dashboard →
   Authentication → Users → [the admin user] → Reset/set password**. Until then,
   sign in via the magic-link fallback at `/login` on the apex domain.
2. **Rotate the leaked Supabase credentials.** A personal access token and DB password were briefly committed to git history and have been scrubbed, but should be treated as compromised: revoke/regenerate the access token in the Supabase dashboard, and reset the database password. — `Needs confirmation`: whether this has been done yet.
3. **Add Stripe keys** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) so the checkout → webhook → entitlement flow can be tested with real (test-mode) payments.
4. **Load real Liberty content**: actual shows, performances (with real Vimeo IDs), categories, and the real parent email list, via the school admin (`/admin/liberty`). The current DB rows are demo seed data.

## Live infrastructure (done — for reference)

- **Netlify**: deployed, auto-deploys from `master` on push. Apex `dancefilms.co.uk` + `liberty.dancefilms.co.uk` both live with SSL.
- **Wildcard subdomains**: a `*` CNAME exists at SiteGround, but Netlify's plan wouldn't accept a `*.dancefilms.co.uk` alias (wildcard certs are a paid tier). **Each new school therefore needs its subdomain added manually** in Netlify → Domain management → Add domain alias.
- **Auth email**: Resend SMTP via Supabase, sending from `@dancefilms.co.uk` (domain verified, DKIM + SPF at SiteGround). Supabase Site URL is the apex, with `https://*.dancefilms.co.uk/**` allowed for redirects.

## Then

- **Stage 9/10 — Harden & test**: a proper RLS test sweep (confirm a non-entitled user genuinely cannot read another show's video refs via direct API calls, not just through the UI), a full mobile/tablet pass, and a reduced-motion/focus accessibility check. The responsive pass done so far was spot-checked, not exhaustive.
- Decide whether Vimeo's paid tier (for domain-restricted embeds) is being purchased, and when — the code needs no changes either way, but it's the actual security boundary for streaming.

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

## Where things stand technically

See `CURRENT_STATE.md` for the full status table. Short version: the app is feature-complete for the Liberty V1 scope described in `docs/Dance Show Platform - Master Brief.md`, is deployed on the real domain, and is not yet receiving real traffic.
