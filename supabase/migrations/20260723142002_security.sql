-- ============================================================================
-- 0002  Security — RLS on every table + policies.
--
-- Core rule: show_videos and performances are readable ONLY with a valid
-- entitlement. shows are readable only by users invited to that school.
-- invited_emails is never client-readable. Admin (is_admin) can read/manage.
--
-- Helpers are SECURITY DEFINER so a policy can consult another table without
-- tripping RLS recursion, and pin search_path for safety.
-- ============================================================================

-- ---- Helper functions -----------------------------------------------------
create or replace function public.is_admin()
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_admin
  );
$$;

create or replace function public.is_invited(p_school uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.invited_emails ie
    where ie.school_id = p_school
      and lower(ie.email) = lower((select auth.email()))
  );
$$;

create or replace function public.has_entitlement(p_show uuid)
  returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entitlements e
    where e.show_id = p_show and e.user_id = (select auth.uid())
  );
$$;

-- ---- Enable RLS on every table --------------------------------------------
alter table public.schools                enable row level security;
alter table public.profiles               enable row level security;
alter table public.invited_emails         enable row level security;
alter table public.shows                  enable row level security;
alter table public.show_videos            enable row level security;
alter table public.categories             enable row level security;
alter table public.performances           enable row level security;
alter table public.performance_categories enable row level security;
alter table public.orders                 enable row level security;
alter table public.entitlements           enable row level security;

-- ---- schools --------------------------------------------------------------
create policy "schools: read active" on public.schools
  for select to anon, authenticated
  using (status = 'active' or public.is_admin());
create policy "schools: admin manage" on public.schools
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- profiles -------------------------------------------------------------
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---- invited_emails : NO client policies (service-role only) --------------
-- RLS enabled with zero policies = deny all to anon/authenticated by design.

-- ---- shows ----------------------------------------------------------------
create policy "shows: read published for invited" on public.shows
  for select to authenticated
  using ((status = 'published' and public.is_invited(school_id)) or public.is_admin());
create policy "shows: admin manage" on public.shows
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- show_videos (entitlement-gated) --------------------------------------
create policy "show_videos: read when entitled" on public.show_videos
  for select to authenticated
  using (public.has_entitlement(show_id) or public.is_admin());
create policy "show_videos: admin manage" on public.show_videos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- categories (entitlement-gated read; used by show-page filters) -------
create policy "categories: read when entitled" on public.categories
  for select to authenticated
  using (public.has_entitlement(show_id) or public.is_admin());
create policy "categories: admin manage" on public.categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- performances (entitlement-gated) -------------------------------------
create policy "performances: read when entitled" on public.performances
  for select to authenticated
  using (public.has_entitlement(show_id) or public.is_admin());
create policy "performances: admin manage" on public.performances
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- performance_categories (gated via parent performance's show) ---------
create policy "perf_cats: read when entitled" on public.performance_categories
  for select to authenticated
  using (exists (
    select 1 from public.performances p
    where p.id = performance_id
      and (public.has_entitlement(p.show_id) or public.is_admin())
  ));
create policy "perf_cats: admin manage" on public.performance_categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---- orders (read own; writes via service role) ---------------------------
create policy "orders: read own or admin" on public.orders
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- ---- entitlements (read own; inserts via service role only) ---------------
create policy "entitlements: read own or admin" on public.entitlements
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- Refresh PostgREST's schema cache so the new grants/tables are exposed.
notify pgrst, 'reload schema';
