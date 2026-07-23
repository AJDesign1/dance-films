-- ============================================================================
-- 0004  Seed — Liberty Dance Company (first tenant) + demo content.
--
-- Idempotent-ish: guarded so re-running won't duplicate the school. Theme jsonb
-- holds the token values the subdomain theming layer applies as CSS variables.
-- Vimeo IDs / prices mirror the Claude Design demo data.
-- ============================================================================

-- ---- School + theme tokens ------------------------------------------------
insert into public.schools (slug, name, status, platform_name, theme)
values (
  'liberty', 'Liberty Dance Company', 'active', 'Liberty Platform',
  jsonb_build_object(
    'primary',     '#13D1C4',
    'secondary',   '#43576E',
    'ink',         '#0B171B',
    'paper',       '#F5F1E8',
    'accentWarm',  '#E8A54B',
    'font_key',    'Big Shoulders Display',
    'theme',       'dark'
  )
)
on conflict (slug) do nothing;

-- ---- Shows ----------------------------------------------------------------
with s as (select id from public.schools where slug = 'liberty')
insert into public.shows (school_id, slug, title, show_year, intro_text, price_pence, status, sort_order)
select s.id, v.slug, v.title, v.yr, v.intro, v.price, v.status::show_status, v.ord
from s, (values
  ('reflections',      'Reflections',      2025, 'Our 2025 summer showcase — every class from Minis to the Elite team.', 2400, 'published', 0),
  ('once-upon-a-time', 'Once Upon a Time', 2024, 'A storybook winter show across two acts.',                              2200, 'published', 1),
  ('electric',         'Electric',         2023, null,                                                                    2000, 'draft',     2)
) as v(slug, title, yr, intro, price, status, ord)
where not exists (select 1 from public.shows sh join s on sh.school_id = s.id where sh.slug = v.slug);

-- ---- Full-show videos -----------------------------------------------------
insert into public.show_videos (show_id, full_show_vimeo_id, duration_seconds)
select id, '903371840', 4360 from public.shows where slug = 'reflections'
on conflict (show_id) do nothing;
insert into public.show_videos (show_id, full_show_vimeo_id, duration_seconds)
select id, '812210050', 3500 from public.shows where slug = 'once-upon-a-time'
on conflict (show_id) do nothing;

-- ---- Categories (class groups + dance styles) for Reflections -------------
with sh as (select id from public.shows where slug = 'reflections')
insert into public.categories (show_id, name, kind, sort_order)
select sh.id, v.name, v.kind::category_kind, v.ord
from sh, (values
  ('Minis (3–5)',            'group', 0),
  ('Midis (5–7)',            'group', 1),
  ('Juniors (7–10)',         'group', 2),
  ('Pre-Teens (10–12)',      'group', 3),
  ('Seniors (13+)',          'group', 4),
  ('Elite Performance Team', 'group', 5),
  ('Ballet',                 'style', 0),
  ('Tap',                    'style', 1),
  ('Modern/Jazz',            'style', 2),
  ('Street/Commercial',      'style', 3)
) as v(name, kind, ord)
where not exists (select 1 from public.categories c where c.show_id = sh.id);

-- ---- Performances for Reflections -----------------------------------------
with sh as (select id from public.shows where slug = 'reflections')
insert into public.performances (show_id, title, vimeo_id, duration_seconds, sort_order)
select sh.id, v.title, v.vimeo, v.dur, v.ord
from sh, (values
  ('Opening — Company', '903371801', 252, 0),
  ('Twinkle',           '903371820', 125, 1),
  ('Playground',        '903371833', 168, 2),
  ('Rise Up',           '903371848', 200, 3),
  ('Swan',              '903371861', 240, 4)
) as v(title, vimeo, dur, ord)
where not exists (select 1 from public.performances p where p.show_id = sh.id);

-- ---- Link performances → one group + one style ----------------------------
insert into public.performance_categories (performance_id, category_id)
select p.id, c.id
from public.performances p
join public.shows s      on s.id = p.show_id and s.slug = 'reflections'
join public.categories c on c.show_id = s.id
where (p.title = 'Opening — Company' and c.name in ('Elite Performance Team','Modern/Jazz'))
   or (p.title = 'Twinkle'           and c.name in ('Minis (3–5)','Ballet'))
   or (p.title = 'Playground'        and c.name in ('Midis (5–7)','Tap'))
   or (p.title = 'Rise Up'           and c.name in ('Juniors (7–10)','Street/Commercial'))
   or (p.title = 'Swan'              and c.name in ('Seniors (13+)','Ballet'))
on conflict do nothing;

-- ---- Invite allowlist (demo parents + the admin) --------------------------
with s as (select id from public.schools where slug = 'liberty')
insert into public.invited_emails (school_id, email, name, status)
select s.id, v.email, v.name, v.status::invite_status
from s, (values
  ('emma.hart@gmail.com',      'Emma Hart',    'registered'),
  ('david.okoro@outlook.com',  'David Okoro',  'registered'),
  ('sara.lindqvist@gmail.com', 'Sara Lindqvist','invited'),
  ('mo.rahman@icloud.com',     null,           'invited'),
  ('ajdesign@hotmail.co.uk',   'Alex Jarvis',  'invited')
) as v(email, name, status)
where not exists (
  select 1 from public.invited_emails ie join s on ie.school_id = s.id
  where lower(ie.email) = lower(v.email)
);
