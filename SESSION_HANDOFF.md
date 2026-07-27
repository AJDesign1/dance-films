# Session Handoff

What to pick up next. Update this file at the end of each working session so the next one (human or AI) doesn't have to reconstruct state from chat history.

## Immediate priorities

1. **Rotate the leaked Supabase credentials.** A personal access token and DB password were briefly committed to git history and have been scrubbed, but should be treated as compromised: revoke/regenerate the access token in the Supabase dashboard, and reset the database password. — `Needs confirmation`: whether this has been done yet.
2. **Add Stripe keys** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) so the checkout → webhook → entitlement flow can be tested with real (test-mode) payments.
3. **Configure Supabase Auth for real magic-link delivery**: Site URL / redirect allowlist, and an SMTP provider (Supabase's default sender is rate-limited). Without this, parents can't actually sign in outside of manually-minted links.
4. **Connect Netlify** and do a first deploy from the GitHub repo. Confirm the wildcard subdomain setup (`*.dancefilms.co.uk`) if that domain is ready to point here.
5. **Load real Liberty content**: actual shows, performances (with real Vimeo IDs), categories, and the real parent email list, via the school admin (`/admin/liberty`). The current DB rows are demo seed data.

## Then

- **Stage 9/10 — Harden & test**: a proper RLS test sweep (confirm a non-entitled user genuinely cannot read another show's video refs via direct API calls, not just through the UI), a full mobile/tablet pass, and a reduced-motion/focus accessibility check. The responsive pass done so far was spot-checked, not exhaustive.
- Decide whether Vimeo's paid tier (for domain-restricted embeds) is being purchased, and when — the code needs no changes either way, but it's the actual security boundary for streaming.

## Known non-blocking gaps

- No per-dance download (full-show only, by design — see `DECISIONS.md`)
- Marketing site / blog / SEO CMS: intentionally not built (V1 scope)
- No automated test suite exists yet (manual verification only, throughout the build)

## Where things stand technically

See `CURRENT_STATE.md` for the full status table. Short version: the app is feature-complete for the Liberty V1 scope described in `docs/Dance Show Platform - Master Brief.md`, and is not yet deployed or receiving real traffic.
