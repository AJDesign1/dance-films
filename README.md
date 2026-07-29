# Dance Films

A themeable, white-label video platform for dance schools to sell and stream filmed shows. Parents log in (invite-only, magic link), buy a show once, and get the full-show video plus every individual performance. **Liberty Dance Company** is the first live school/theme.

This repository is the **single source of truth** for the project — code, schema (as migrations), and docs together.

## Stack

- **Next.js 15** (App Router, TypeScript) — no Tailwind; styling is a CSS-variable token system (see `app/globals.css`) so the whole UI is themeable per school
- **Supabase** — Postgres, Auth (magic link), Storage (branding images), Row-Level Security
- **Stripe** — hosted Checkout (not an in-app card form) → webhook → entitlement
- **Vimeo** — iframe embeds only, with anti-copy deterrents (see `docs/`)
- **Netlify** — target host (`netlify.toml` present; not yet connected — see `SESSION_HANDOFF.md`)

## Repo layout

```
app/
  (platform)/        Customer-facing app: login, welcome, shows (shop), show/[slug], checkout
  (admin)/admin/      School + master admin: [slug]/{branding,shows,performances,categories,parents,users}
  auth/               Route handlers: callback, confirm, signout
  api/stripe/webhook/ Stripe webhook (entitlement unlock)
components/
  platform/           Customer UI components
  admin/              Admin UI components
lib/                  Supabase clients (browser/server/admin), auth, tenant, theme, format, stripe, vimeo helpers
supabase/migrations/  Version-controlled schema — the source of truth for the DB
design/project/       Claude Design handoff (HTML/CSS/JS prototypes) — the UI spec; preserve, don't restyle
brand/                Dance Films brand: DESIGN_GUIDE.md + source artwork (.ai, PDFs)
public/brand/         Web-served brand SVGs (stacked + linear logos, gradient)
docs/                 Original product/schema spec docs (see below)
```

Two brands live here: each **school's** theme (from the database) skins the parent
portal, while **Dance Films'** own brand — see [`brand/DESIGN_GUIDE.md`](brand/DESIGN_GUIDE.md) —
skins the admin area and the marketing/holding pages.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your own Supabase/Stripe values
npm run dev
```

Do not run `npm run build` while `npm run dev` is active against the same `.next` — they share the build cache and corrupt each other. Stop one before running the other.

Admin is gated by `profiles.is_admin`. Magic-link email delivery is not yet configured for local dev (see `SESSION_HANDOFF.md`) — signing in locally currently requires minting a link via the Supabase Auth admin API.

## Source docs (original spec — still authoritative for intent)

- [`docs/Dance Show Platform - Master Brief.md`](docs/Dance%20Show%20Platform%20-%20Master%20Brief.md) — product decisions, V1 scope
- [`docs/Supabase Schema & Claude Code Handoff.md`](docs/Supabase%20Schema%20%26%20Claude%20Code%20Handoff.md) — schema sketch, security model, build order
- [`docs/Claude Design Prompts.md`](docs/Claude%20Design%20Prompts.md) — UI/UX intent behind the design handoff

## Project docs (this repo)

- [`CURRENT_STATE.md`](CURRENT_STATE.md) — what's built, what isn't
- [`DECISIONS.md`](DECISIONS.md) — key decisions and why
- [`CHANGELOG.md`](CHANGELOG.md) — chronological build log
- [`AI_INSTRUCTIONS.md`](AI_INSTRUCTIONS.md) — rules for any AI agent working in this repo
- [`SESSION_HANDOFF.md`](SESSION_HANDOFF.md) — open items / what to do next
