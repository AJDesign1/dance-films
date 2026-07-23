# Supabase Schema & Claude Code Handoff

Companion to the Master Brief. This is the technical spec for building the platform in Claude Code: the database schema, the security model, the integrations, and the build order. Treat table/column names as a sensible starting point to refine during build, not gospel.

---

## 0. Golden rules for the build

1. **Preserve the Claude Design UI.** Wire up functionality; do not restyle finished screens. Any new connected states should match the existing look.
2. **Everything is themeable via CSS-variable tokens** (see Master Brief §7a). No hard-coded colours/fonts. A school's branding loads from the DB per subdomain.
3. **Never expose the Supabase service-role key or Stripe secret to the browser.** Privileged operations (webhooks, allowlist checks, admin writes) run server-side only.
4. **Access is enforced in the database with Row-Level Security**, not just in the UI. The UI hiding a button is not security.
5. **Video/photos are never served by the app** — Vimeo hosts video; images via Supabase Storage (small assets) with Cloudinary/R2 as the future photo option.

---

## 1. Entity overview

```
schools ──┬── shows ──┬── show_videos (full-show Vimeo ref, gated)
          │           ├── performances ──< performance_categories >── categories
          │           └── orders / entitlements (per user)
          ├── invited_emails (allowlist)
          └── (branding/theme lives on the school row)

auth.users ── profiles ──< entitlements >── shows
```

- A **school** is the tenant. Everything hangs off it. Liberty is the first.
- A **user** (parent) is global (one Supabase Auth account); their access to a school comes from `invited_emails`, and their access to a show comes from `entitlements`.

---

## 2. Tables (SQL sketch)

```sql
-- Enums
create type school_status as enum ('active','disabled');
create type show_status   as enum ('draft','published');
create type invite_status as enum ('invited','registered');
create type order_status  as enum ('pending','paid','refunded');
create type entitlement_source as enum ('purchase','granted');

-- Schools (tenant) + branding tokens
create table schools (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,          -- subdomain, e.g. 'liberty'
  name          text not null,
  status        school_status not null default 'active',
  platform_name text,                           -- display name
  logo_colour_url text,
  logo_white_url  text,
  hero_image_url  text,
  theme         jsonb not null default '{}',    -- token values: colours, font_key, radius, etc.
  created_at    timestamptz not null default now()
);

-- Profiles (mirror of auth.users)
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Invite allowlist (per school)
create table invited_emails (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  email      text not null,
  name       text,
  status     invite_status not null default 'invited',
  created_at timestamptz not null default now(),
  unique (school_id, lower(email))
);

-- Shows (public-ish metadata; NO sensitive video ids here)
create table shows (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  slug        text not null,
  title       text not null,
  show_year   int,
  intro_text  text,
  artwork_url text,
  price_pence int not null default 0,
  stripe_price_id text,
  status      show_status not null default 'draft',
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  unique (school_id, slug)
);

-- Full-show video ref, gated by entitlement (kept separate from shows)
create table show_videos (
  show_id            uuid primary key references shows(id) on delete cascade,
  full_show_vimeo_id text
);

-- Categories (flexible, per show)
create table categories (
  id         uuid primary key default gen_random_uuid(),
  show_id    uuid not null references shows(id) on delete cascade,
  name       text not null,
  sort_order int not null default 0
);

-- Performances (individual dances) — gated by entitlement
create table performances (
  id             uuid primary key default gen_random_uuid(),
  show_id        uuid not null references shows(id) on delete cascade,
  title          text not null,
  vimeo_id       text not null,
  thumbnail_url  text,
  duration_seconds int,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create table performance_categories (
  performance_id uuid references performances(id) on delete cascade,
  category_id    uuid references categories(id) on delete cascade,
  primary key (performance_id, category_id)
);

-- Orders (Stripe)
create table orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id),
  show_id     uuid not null references shows(id),
  amount_pence int not null,
  currency    text not null default 'gbp',
  status      order_status not null default 'pending',
  stripe_session_id text,
  created_at  timestamptz not null default now()
);

-- Entitlements (what a user can watch)
create table entitlements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  show_id    uuid not null references shows(id) on delete cascade,
  source     entitlement_source not null default 'purchase',
  created_at timestamptz not null default now(),
  unique (user_id, show_id)
);
```

Notes:
- `price_pence` stores money as integers (avoid float rounding). £24 = `2400`.
- `theme` jsonb holds token values (primary/secondary/ink/paper/accent hex, `font_key`, radius) so branding is fully data-driven.
- Categories are **per show** (matches the brief). Could be promoted to per-school reusable later.

---

## 3. Security model (RLS)

**Data API settings (set at project creation):** *Enable Data API* = **on** (the app uses `supabase-js`). *Automatically expose new tables* = **off** (safer). Because auto-expose is off, **each table the app needs must be explicitly granted API access in its migration** (grant to `anon`/`authenticated` as appropriate) — do this deliberately per table. RLS remains the primary gate on top of that.

Enable RLS on **every** table. Key policies:

- **schools:** `anon` + `authenticated` may **read** branding for an `active` school (needed to theme the login page *before* auth, resolved by subdomain). No public writes.
- **profiles:** a user can read/update **their own** row. `is_admin` only settable via service role.
- **invited_emails:** **no** client read/write. Allowlist checks happen server-side (service role) or via a `security definer` function. Admin manages via server actions.
- **shows:** `authenticated` users who are **invited to that school** may read **published** shows (metadata for the shop). Drafts: admin only.
- **show_videos & performances:** readable **only if** the user has an `entitlement` for that `show_id`. This is the core gate — un-owned shows return no video refs at all.
  ```sql
  -- example: performances readable only when entitled
  create policy "entitled can read performances" on performances
  for select using (
    exists (select 1 from entitlements e
            where e.show_id = performances.show_id
              and e.user_id = auth.uid())
  );
  ```
- **entitlements:** user reads **own**; inserts happen **only** via service role (Stripe webhook or admin grant).
- **orders:** user reads **own**; writes via service role only.
- **Admin (Alex, ajdesign@hotmail.co.uk):** an `is_admin` profile flag grants broader policies (or the admin app uses the service role behind server-side auth). Admin can manage all school content.

### Invite-only magic link
Supabase Auth allows anyone to request an OTP by default, so we must gate it:
1. **App-layer (V1):** the login server action first checks `invited_emails` for `(school, email)`. If present → `supabase.auth.signInWithOtp(email)`. If not → return the "not invited" state. No link is sent to non-invited emails.
2. **Hardening (recommended):** add a Supabase **Auth Hook** ("before user created" / send-email hook) that rejects emails not on the allowlist, so it can't be bypassed by calling the API directly.
On first successful sign-in, upsert a `profiles` row; set `name` from the allowlist if present, otherwise prompt once for it.

---

## 4. Integrations

### Stripe (payments)
- One **Product/Price per show** (or dynamic price from `price_pence`); store `stripe_price_id` on the show.
- Buy flow: server creates a **Checkout Session** (mode `payment`, GBP) for the logged-in user + show → redirect to Stripe → return to a success page.
- **Webhook** (`checkout.session.completed`), verified with the signing secret, runs server-side and: marks the `order` paid and **inserts the `entitlement`** (service role). This is the only thing that unlocks a show.
- Refund handling: admin action → refund in Stripe + set order `refunded` + remove entitlement.
- Keep `STRIPE_SECRET_KEY` server-side only. PayPal is a later, optional second button.

### Vimeo (video)
- App stores `vimeo_id` only and renders the **Vimeo embed** player. No video files touch Netlify/Supabase.
- Configure each video's Vimeo privacy: hidden from vimeo.com, and **embed-restricted to the platform's domains** (`*.dancefilms.co.uk`), so links can't be shared/played elsewhere.
- Custom thumbnails: store `thumbnail_url` or fall back to Vimeo's.

### Subdomain theming (multi-tenant)
- Wildcard DNS `*.dancefilms.co.uk` → the app. **Confirm wildcard custom-domain setup on Netlify.**
- **Next.js middleware** reads the subdomain → resolves the `school` by `slug` → loads its `theme` + logos → applies token values as CSS variables for the request. Unknown subdomain → sensible fallback / not-found.
- `dancefilms.co.uk` (apex) is reserved for the **marketing site** (deferred) — route it separately.

---

## 5. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only
STRIPE_SECRET_KEY=                # server only
STRIPE_WEBHOOK_SECRET=            # server only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
NEXT_PUBLIC_ROOT_DOMAIN=dancefilms.co.uk
```

---

## 6. Suggested build order

1. **Project skeleton** — Next.js on Netlify, Supabase project, env wired, `frontend-design` skill installed.
2. **Schema + RLS** — create tables, enums, policies; seed the Liberty school + its theme tokens.
3. **Theming layer** — subdomain middleware + CSS-variable tokens from the school row; port the Claude Design UI onto tokens (preserve the look).
4. **Auth** — invite-only magic link (app-layer check + allowlist), profile creation, name capture, account menu / sign-out.
5. **Shows shop** — logged-in shows list with owned ("Watch") / not-owned ("Buy") states from entitlements; personalised welcome headline.
6. **Show page + video** — hero, gated full-show video, performance library, flexible category filters, video-viewing screen with prev/next/back.
7. **Stripe** — checkout + webhook → entitlement; success/return states.
8. **School admin** — branding & config, shows, performances (Vimeo refs, reorder), categories, invited parents (bulk add), users & entitlements (grant/revoke/refund).
9. **Master admin (V1 slice)** — schools list + "Configure" into school admin. (Marketing/blog/SEO deferred.)
10. **Harden & test** — RLS tests (a user cannot read another's shows), webhook tests, mobile QA, reduced-motion/focus checks.

---

## 7. V1 vs later

- **V1:** Liberty school platform end-to-end (auth → shop → buy → watch) + the admin to run it. Single admin (Alex).
- **Later / architected-for:** marketing site + blog/SEO + master-admin marketing tools; photography galleries (Supabase Storage → Cloudinary/R2); multiple live school themes; PayPal.

---

## 8. Open technical questions to resolve during build

- Netlify wildcard subdomain + SSL setup for `*.dancefilms.co.uk`.
- Supabase free tier pauses when idle / no backups → move to **Pro (~£20/mo)** when going live.
- Whether to enforce the allowlist via Auth Hook (recommended) in addition to the app-layer check.
- Exact `theme` jsonb shape (finalise token keys with the design).
