-- ============================================================================
-- 0014  Access codes — alternative onboarding route into a school.
--
-- A code lets someone create/verify their account and get added to a
-- school's approved list WITHOUT already being on invited_emails — the whole
-- point is to unblock someone who isn't invited yet or can't get the
-- magic-link email. It is not a login credential itself: redemption ends in
-- the exact same place as a normal invite (a row in invited_emails + a
-- magic-link sign-in), so from then on the user just uses normal
-- magic-link login. Same sensitivity as invited_emails, so same posture:
-- RLS enabled, zero client policies, service-role only.
-- ============================================================================
create type public.access_code_status as enum ('active', 'disabled');

create table public.access_codes (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  show_id    uuid references public.shows(id) on delete set null,
  code       text not null,
  status     access_code_status not null default 'active',
  created_at timestamptz not null default now()
);
create unique index access_codes_school_code_key on public.access_codes (school_id, code);
create index access_codes_school_idx on public.access_codes (school_id);

alter table public.access_codes enable row level security;
-- No anon/authenticated policies (matches invited_emails) — always
-- looked up/managed via the service role, never RLS-scoped.

notify pgrst, 'reload schema';
