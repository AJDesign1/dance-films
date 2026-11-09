-- Per-school gallery and quote, covered by existing schools grants and RLS.
-- Keep legacy team fields intact; this redesign does not delete content/assets.
alter table public.schools
  add column gallery_image_urls text[] not null default '{}',
  add column quote_text text,
  add column quote_name text,
  add column quote_role text,
  add constraint schools_gallery_max_six check (cardinality(gallery_image_urls) <= 6);

comment on column public.schools.gallery_image_urls is
  'Ordered Behind the Scenes images (maximum six). Empty hides the gallery.';
comment on column public.schools.quote_text is
  'Behind the Lens personal quote. Null or blank hides the quote section.';

update public.schools set
  quote_text = 'I''ve been photographing and filming Liberty''s shows for over 10 years now, and it''s been lovely watching the dancers grow in confidence and seeing how much the school has developed. I know how much work goes into every show, so it''s always special to capture those moments for everyone to look back on.',
  quote_name = 'Alex Jarvis',
  quote_role = 'Founder, Dance Films',
  gallery_image_urls = case when nullif(trim(team_image_url), '') is not null
    then array[team_image_url] else '{}'::text[] end
where slug = 'liberty';
