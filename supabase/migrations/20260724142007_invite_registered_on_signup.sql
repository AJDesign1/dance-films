-- ============================================================================
-- 0007  On first sign-in, mark the parent's allowlist row(s) as registered.
-- Extends handle_new_user so the admin's "signed up" status stays accurate.
-- ============================================================================
create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, name, is_admin)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'name', ''),
    lower(new.email) = 'ajdesign@hotmail.co.uk'
  )
  on conflict (id) do nothing;

  update public.invited_emails
     set status = 'registered'
   where lower(email) = lower(new.email);

  return new;
end;
$$;
