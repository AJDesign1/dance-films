-- Metadata remains within the existing school's invitation boundary.
-- Coming Soon never unlocks content, even for a previous purchaser.
drop policy "shows: read published for invited" on public.shows;
create policy "shows: read listed for invited" on public.shows
  for select to authenticated
  using ((status in ('published', 'coming_soon') and public.is_invited(school_id)) or public.is_admin());

create or replace function public.has_entitlement(p_show uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entitlements e
    join public.shows s on s.id = e.show_id
    where e.show_id = p_show and e.user_id = (select auth.uid())
      and s.status = 'published'
  );
$$;

-- Used by the existing listing; the protected get_show_page RPC deliberately
-- remains Published-only. No video identifiers are returned by this RPC.
create or replace function public.get_shows_page(p_school_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'slug', s.slug,
    'title', s.title,
    'show_year', s.show_year,
    'season', s.season,
    'price_pence', s.price_pence,
    'sale_price_pence', s.sale_price_pence,
    'artwork_url', s.artwork_url,
    'status', s.status,
    'owned', s.status = 'published' and (public.has_entitlement(s.id) or public.is_admin())
  ) order by s.sort_order), '[]'::jsonb)
  from public.shows s
  where s.school_id = p_school_id and s.status in ('published', 'coming_soon');
$$;

-- Check transitions in the database too, including direct admin/API writes.
-- Existing Published rows are not rewritten or retroactively invalidated.
create function public.validate_show_publication()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'published' then return new; end if;
  if TG_OP = 'UPDATE' then
    if old.status = 'published' then return new; end if;
  end if;
  if nullif(btrim(new.title), '') is null or new.price_pence <= 0
    or (new.sale_price_pence is not null and (new.sale_price_pence <= 0 or new.sale_price_pence >= new.price_pence)) then
    raise exception 'A title and valid pricing are required before publishing.';
  end if;
  if not exists (
    select 1 from public.show_videos sv
    where sv.show_id = new.id and nullif(btrim(sv.full_show_bunny_video_id), '') is not null
  ) then
    raise exception 'Add a full-show video before publishing.';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_show_publication() from public, anon, authenticated;
create trigger validate_show_publication before insert or update of status on public.shows
for each row execute function public.validate_show_publication();

-- New checkout orders cannot be created for an unlisted/unavailable show,
-- including through service-role callers. Existing payment reconciliation
-- (updates to orders and entitlement grants) remains unchanged.
create function public.validate_show_order()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.shows where id = new.show_id and status = 'published' for share;
  if not found then raise exception 'That show is not available to purchase.'; end if;
  return new;
end;
$$;
revoke all on function public.validate_show_order() from public, anon, authenticated;
create trigger validate_show_order before insert on public.orders
for each row execute function public.validate_show_order();

notify pgrst, 'reload schema';
