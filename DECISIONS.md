# Decisions

Key choices made during the build and the reasoning behind them. For the original product decisions (pricing model, invite-only, whole-show purchase, etc.), see `docs/Dance Show Platform - Master Brief.md` — this file covers decisions made *during implementation* that extend or reconcile that spec.

## Stripe: hosted Checkout, not the design's in-app card form

The Claude Design handoff mocked an in-app card-entry modal. We kept its visual shell (order summary) but the actual card entry happens on **Stripe's hosted Checkout page**, not a form we control. This is what the handoff's security rules require and keeps the app out of PCI scope — we never see raw card data.

## Video: iframe-only embeds, resolved on demand

Streaming uses the Vimeo iframe embed exclusively, never a direct file URL. Embed URLs are fetched by a server action **at play time**, re-checking the user's entitlement via RLS — the `vimeo_id` never appears in page markup or the initial client payload. Context menu and text selection are disabled over the player.

This is explicitly a **deterrent**, not DRM — screen recording can't be stopped by any of this. The real access control is Vimeo's **domain-restricted embed**, an account-level setting available on paid Vimeo plans. The code is structured so enabling that later requires zero changes — we already only use the iframe embed.

## Categories have a `kind` (group vs style)

The show page has two independent filter rows: class/age group (e.g. "Minis (3–5)") and dance style (e.g. "Ballet"). Rather than a second table, `categories` has a `kind` enum (`'group' | 'style'`). The admin's Performances screen has a select for each kind per dance.

## `service_role` needed explicit grants

Because Data API auto-expose is off (a deliberate security choice), every table needs explicit grants per role. Early on, `service_role` itself had no grants — this silently broke the invite-allowlist check, the Stripe webhook's entitlement insert, and admin reads, because all of those use the service-role client to bypass RLS intentionally. Fixed by granting `service_role` full privileges on the `public` schema (migration `20260724142008_service_role_grants.sql`). If a future admin/service-role query mysteriously returns nothing, check grants before assuming an RLS or logic bug.

## Full-show download is a separate, owner-gated feature

Parents can download the full show they own (replacing the old DVD/USB), independent of streaming. The download URL is admin-set (a Vimeo download link on a paid plan, or any hosted file) and resolved on demand the same way the streaming embed is — entitlement-checked, never in markup. Per-dance downloads were considered but are **not** implemented — full-show only.

## Filters are dropdowns, not chip rows

The design's chip-row filters (group + style) got visually messy with real category counts (6 groups × 4 styles). Replaced with two `<select>` dropdowns that filter independently and together, with a "Clear filters" affordance. This is a deviation from the literal design handoff, made for real-content usability.

## Branding images are Storage uploads, not URL fields

Originally shipped as plain URL text fields (fastest to build). Replaced with real file uploads to a Supabase Storage `branding` bucket for logo (colour + white) and sign-in photo, matching how a non-technical school admin actually expects to set branding.

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
