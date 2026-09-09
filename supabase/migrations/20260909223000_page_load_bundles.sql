-- Collapse the parent shop/show page reads into one Data API round trip.
-- These are SECURITY INVOKER functions: every underlying table still applies
-- the authenticated caller's existing RLS policies.

create or replace function public.get_shows_page(p_school_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'slug', s.slug,
        'title', s.title,
        'show_year', s.show_year,
        'season', s.season,
        'price_pence', s.price_pence,
        'sale_price_pence', s.sale_price_pence,
        'artwork_url', s.artwork_url,
        'owned', public.has_entitlement(s.id) or public.is_admin()
      )
      order by s.sort_order
    ),
    '[]'::jsonb
  )
  from public.shows s
  where s.school_id = p_school_id
    and s.status = 'published';
$$;

create or replace function public.get_show_page(p_school_id uuid, p_show_slug text)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_show_id uuid;
  v_show jsonb;
  v_owned boolean;
  v_video jsonb;
  v_downloaded boolean;
  v_performances jsonb;
  v_categories jsonb;
begin
  select s.id,
         jsonb_build_object(
           'id', s.id,
           'slug', s.slug,
           'title', s.title,
           'show_year', s.show_year,
           'season', s.season,
           'intro_text', s.intro_text,
           'artwork_url', s.artwork_url,
           'price_pence', s.price_pence,
           'sale_price_pence', s.sale_price_pence
         )
    into v_show_id, v_show
    from public.shows s
   where s.school_id = p_school_id
     and s.slug = p_show_slug
     and s.status = 'published'
   limit 1;

  if v_show_id is null then
    return null;
  end if;

  v_owned := public.has_entitlement(v_show_id) or public.is_admin();

  if not v_owned then
    return jsonb_build_object('show', v_show, 'owned', false);
  end if;

  select jsonb_build_object(
           'duration_seconds', sv.duration_seconds,
           'has_full_show', nullif(sv.full_show_bunny_video_id, '') is not null,
           'has_thumbnail', sv.full_show_thumbnail_url is not null
         )
    into v_video
    from public.show_videos sv
   where sv.show_id = v_show_id;

  select exists(
    select 1
      from public.downloads d
     where d.show_id = v_show_id
       and d.user_id = (select auth.uid())
  ) into v_downloaded;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', p.id,
               'title', p.title,
               'has_thumbnail', p.thumbnail_url is not null,
               'duration_seconds', p.duration_seconds,
               'category_ids', coalesce(
                 (
                   select jsonb_agg(pc.category_id)
                     from public.performance_categories pc
                    where pc.performance_id = p.id
                 ),
                 '[]'::jsonb
               )
             )
             order by p.sort_order
           ),
           '[]'::jsonb
         )
    into v_performances
    from public.performances p
   where p.show_id = v_show_id;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', c.id,
               'name', c.name,
               'kind', c.kind
             )
             order by c.sort_order
           ),
           '[]'::jsonb
         )
    into v_categories
    from public.categories c
   where c.show_id = v_show_id;

  return jsonb_build_object(
    'show', v_show,
    'owned', true,
    'video', v_video,
    'downloaded', v_downloaded,
    'performances', v_performances,
    'categories', v_categories
  );
end;
$$;

revoke all on function public.get_shows_page(uuid) from public, anon;
revoke all on function public.get_show_page(uuid, text) from public, anon;
grant execute on function public.get_shows_page(uuid) to authenticated;
grant execute on function public.get_show_page(uuid, text) to authenticated;

notify pgrst, 'reload schema';
