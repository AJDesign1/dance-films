-- ============================================================================
-- 0001  Schema — enums, tables, indexes, and per-table API grants.
--
-- Data API auto-expose is OFF, so every table the app reaches via supabase-js
-- must be granted to anon/authenticated explicitly here. RLS (migration 0002)
-- is the real gate on top of these grants. Sensitive tables (invited_emails,
-- orders, entitlements writes) get NO client grants — service-role only.
-- ============================================================================

-- ---- Enums ----------------------------------------------------------------
create type school_status      as enum ('active','disabled');
create type show_status        as enum ('draft','published');
create type invite_status      as enum ('invited','registered');
create type order_status       as enum ('pending','paid','refunded');
create type entitlement_source as enum ('purchase','granted');
-- Categories carry a kind so the show page's two filter rows (class group +
-- dance style) both come from one flexible, per-show table.
create type category_kind      as enum ('group','style');

-- ---- Schools (tenant) + branding tokens -----------------------------------
create table public.schools (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,           -- subdomain, e.g. 'liberty'
  name            text not null,
  status          school_status not null default 'active',
  platform_name   text,
  logo_colour_url text,
  logo_white_url  text,
  hero_image_url  text,
  theme           jsonb not null default '{}',    -- token values: colours, font_key, theme(light/dark), radius…
  created_at      timestamptz not null default now()
);

-- ---- Profiles (mirror of auth.users) --------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text,
  is_admin   boolean not null default false,      -- only settable via service role
  created_at timestamptz not null default now()
);

-- ---- Invite allowlist (per school) — server-side only ---------------------
create table public.invited_emails (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  email      text not null,
  name       text,
  status     invite_status not null default 'invited',
  created_at timestamptz not null default now()
);
-- Case-insensitive uniqueness per school (expression → unique index, not a table constraint).
create unique index invited_emails_school_email_key
  on public.invited_emails (school_id, lower(email));

-- ---- Shows (public-ish metadata; NO sensitive video ids here) -------------
create table public.shows (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools(id) on delete cascade,
  slug            text not null,
  title           text not null,
  show_year       int,
  intro_text      text,
  artwork_url     text,
  price_pence     int not null default 0,
  stripe_price_id text,
  status          show_status not null default 'draft',
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (school_id, slug)
);
create index shows_school_idx on public.shows (school_id);

-- ---- Full-show video ref, gated by entitlement (kept off `shows`) ---------
create table public.show_videos (
  show_id            uuid primary key references public.shows(id) on delete cascade,
  full_show_vimeo_id text,
  duration_seconds   int
);

-- ---- Categories (flexible, per show) --------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  show_id    uuid not null references public.shows(id) on delete cascade,
  name       text not null,
  kind       category_kind not null default 'group',
  sort_order int not null default 0
);
create index categories_show_idx on public.categories (show_id);

-- ---- Performances (individual dances) — gated by entitlement --------------
create table public.performances (
  id               uuid primary key default gen_random_uuid(),
  show_id          uuid not null references public.shows(id) on delete cascade,
  title            text not null,
  vimeo_id         text not null,
  thumbnail_url    text,
  duration_seconds int,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);
create index performances_show_idx on public.performances (show_id);

create table public.performance_categories (
  performance_id uuid references public.performances(id) on delete cascade,
  category_id    uuid references public.categories(id) on delete cascade,
  primary key (performance_id, category_id)
);

-- ---- Orders (Stripe) — writes are service-role only -----------------------
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id),
  show_id           uuid not null references public.shows(id),
  amount_pence      int not null,
  currency          text not null default 'gbp',
  status            order_status not null default 'pending',
  stripe_session_id text,
  created_at        timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id);

-- ---- Entitlements (what a user can watch) — inserts service-role only ------
create table public.entitlements (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  show_id    uuid not null references public.shows(id) on delete cascade,
  source     entitlement_source not null default 'purchase',
  created_at timestamptz not null default now(),
  unique (user_id, show_id)
);
create index entitlements_user_idx on public.entitlements (user_id);

-- ============================================================================
-- API grants (auto-expose is OFF → grant deliberately per table).
-- Writes to content tables are allowed at the SQL layer but restricted to
-- admins by RLS in 0002. invited_emails/orders/entitlements are omitted on
-- purpose — reached only via the service role.
-- ============================================================================
grant usage on schema public to anon, authenticated;

-- schools: branding readable pre-auth (to theme the login page)
grant select                         on public.schools    to anon, authenticated;
grant insert, update, delete         on public.schools    to authenticated;

-- profiles: own row read; only the name column is client-updatable
grant select                         on public.profiles   to authenticated;
grant update (name)                  on public.profiles   to authenticated;

-- shows + content: read for invited/entitled users; write gated to admins by RLS
grant select, insert, update, delete on public.shows                  to authenticated;
grant select, insert, update, delete on public.show_videos            to authenticated;
grant select, insert, update, delete on public.categories             to authenticated;
grant select, insert, update, delete on public.performances           to authenticated;
grant select, insert, update, delete on public.performance_categories to authenticated;

-- orders + entitlements: read own only; writes happen via service role
grant select                         on public.orders       to authenticated;
grant select                         on public.entitlements to authenticated;
