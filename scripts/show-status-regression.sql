-- Run against a disposable database with the application migrations applied:
-- psql ... -v ON_ERROR_STOP=1 -f scripts/show-status-regression.sql
begin;
insert into auth.users(id,email) values ('f0000000-0000-0000-0000-000000000001','status-test@example.test');
insert into public.schools(id,slug,name) values ('f0000000-0000-0000-0000-000000000002','status-test','Status Test');
insert into public.invited_emails(school_id,email) values ('f0000000-0000-0000-0000-000000000002','status-test@example.test');
-- A legacy Published show is inserted as Draft and published with valid video.
insert into public.shows(id,school_id,slug,title,status,price_pence) values
('f0000000-0000-0000-0000-000000000003','f0000000-0000-0000-0000-000000000002','ready','Ready','draft',2400),
('f0000000-0000-0000-0000-000000000004','f0000000-0000-0000-0000-000000000002','soon','Soon','coming_soon',0),
('f0000000-0000-0000-0000-000000000005','f0000000-0000-0000-0000-000000000002','draft','Draft','draft',0);
insert into public.show_videos(show_id,full_show_bunny_video_id,download_url) values
('f0000000-0000-0000-0000-000000000003','video','https://example.test/download');
update public.shows set status='published' where slug='ready' and school_id='f0000000-0000-0000-0000-000000000002';
insert into public.performances(id,show_id,title,bunny_video_id) values
('f0000000-0000-0000-0000-000000000006','f0000000-0000-0000-0000-000000000003','Dance','dance-video');
insert into public.entitlements(user_id,show_id,source) values
('f0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000003','granted');

-- Direct writes must not bypass publish validation or create pending orders.
do $$
begin
  begin
    update public.shows set status='published' where id='f0000000-0000-0000-0000-000000000004';
    raise exception 'TEST: published without price';
  exception when raise_exception then
    if SQLERRM like 'TEST:%' then raise; end if;
  end;
  update public.shows set price_pence=2400 where id='f0000000-0000-0000-0000-000000000004';
  begin
    update public.shows set status='published' where id='f0000000-0000-0000-0000-000000000004';
    raise exception 'TEST: published without video';
  exception when raise_exception then
    if SQLERRM like 'TEST:%' then raise; end if;
  end;
  begin
    insert into public.orders(user_id,show_id,amount_pence) values
    ('f0000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000004',2400);
    raise exception 'TEST: purchased Coming Soon';
  exception when raise_exception then
    if SQLERRM like 'TEST:%' then raise; end if;
  end;
end $$;

set local role authenticated;
set local request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000001';
set local request.jwt.claim.email = 'status-test@example.test';
do $$
declare listing jsonb;
begin
  listing := public.get_shows_page('f0000000-0000-0000-0000-000000000002');
  assert jsonb_array_length(listing)=2, 'Only Published and Coming Soon should be listed';
  assert listing @> '[{"slug":"soon","status":"coming_soon","owned":false}]', 'Coming Soon metadata missing';
  assert public.get_show_page('f0000000-0000-0000-0000-000000000002','soon') is null, 'Coming Soon protected page exposed';
  assert public.get_show_page('f0000000-0000-0000-0000-000000000002','draft') is null, 'Draft page exposed';
  assert (public.get_show_page('f0000000-0000-0000-0000-000000000002','ready')->>'owned')::boolean, 'Published entitlement broken';
  assert (select count(*) from public.show_videos where show_id='f0000000-0000-0000-0000-000000000003')=1, 'Published video hidden';
  assert (select count(*) from public.performances where show_id='f0000000-0000-0000-0000-000000000003')=1, 'Published performance hidden';
end $$;
reset role;
-- Preserve the entitlement and video, but revoke access when status changes.
update public.shows set status='coming_soon' where id='f0000000-0000-0000-0000-000000000003';
set local role authenticated;
do $$ begin
  assert not public.has_entitlement('f0000000-0000-0000-0000-000000000003'), 'Coming Soon still unlocked';
  assert (select count(*) from public.show_videos where show_id='f0000000-0000-0000-0000-000000000003')=0, 'Coming Soon video exposed';
  assert (select count(*) from public.performances where show_id='f0000000-0000-0000-0000-000000000003')=0, 'Coming Soon performance exposed';
  assert public.get_show_page('f0000000-0000-0000-0000-000000000002','ready') is null, 'Coming Soon page exposed to previous purchaser';
end $$;
reset role;
update public.shows set status='draft' where id='f0000000-0000-0000-0000-000000000003';
set local role authenticated;
do $$ begin
  assert jsonb_array_length(public.get_shows_page('f0000000-0000-0000-0000-000000000002'))=1, 'Draft still listed';
  assert (select count(*) from public.show_videos where show_id='f0000000-0000-0000-0000-000000000003')=0, 'Draft video exposed';
end $$;
reset role;
update public.shows set status='published' where id='f0000000-0000-0000-0000-000000000003';
set local role authenticated;
do $$ begin
  assert public.has_entitlement('f0000000-0000-0000-0000-000000000003'), 'Republishing lost entitlement';
  assert (select count(*) from public.show_videos where show_id='f0000000-0000-0000-0000-000000000003')=1, 'Republishing lost video';
end $$;
reset role;
-- An authenticated visitor from another school sees neither metadata nor content.
set local request.jwt.claim.email = 'not-invited@example.test';
set local request.jwt.claim.sub = 'f0000000-0000-0000-0000-000000000007';
set local role authenticated;
do $$ begin
  assert public.get_shows_page('f0000000-0000-0000-0000-000000000002')='[]'::jsonb, 'School isolation broken';
  assert (select count(*) from public.show_videos where show_id='f0000000-0000-0000-0000-000000000003')=0, 'Non-owner video exposed';
end $$;
reset role;
rollback;
