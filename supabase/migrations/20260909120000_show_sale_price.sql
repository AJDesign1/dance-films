-- Optional per-show promotional price. The regular price remains the source
-- for the crossed-out comparison; checkout charges this lower value while set.
alter table public.shows
  add column sale_price_pence int;

alter table public.shows
  add constraint shows_sale_price_valid
  check (
    sale_price_pence is null
    or (sale_price_pence > 0 and sale_price_pence < price_pence)
  );

comment on column public.shows.sale_price_pence is
  'Optional discounted price in pence; must be positive and below price_pence.';
