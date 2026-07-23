-- ============================================================================
-- 0005  Demo tenant — Stardust Academy of Dance.
--
-- Proves the multi-tenant theming layer: a second active school with a wholly
-- different palette (purple), rendering the same components as its own brand.
-- No shows / invites — it exists only to demonstrate subdomain reskinning and
-- can be removed once real second schools are onboarded. (V1 remains Liberty.)
-- ============================================================================
insert into public.schools (slug, name, status, platform_name, theme)
values (
  'stardust', 'Stardust Academy of Dance', 'active', 'Stardust Live',
  jsonb_build_object(
    'primary',    '#B14BE8',
    'secondary',  '#2E2A4A',
    'ink',        '#0B0A14',
    'paper',      '#F3EFF8',
    'accentWarm', '#E8A54B',
    'font_key',   'Big Shoulders Display',
    'theme',      'dark'
  )
)
on conflict (slug) do nothing;
