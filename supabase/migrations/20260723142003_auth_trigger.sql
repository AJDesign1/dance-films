-- ============================================================================
-- 0003  Auth — auto-create a profile on first sign-in.
--
-- On a new auth user, upsert a profiles row. Name comes from the invite/signup
-- metadata if present (otherwise captured once in-app on first sign-in). The
-- sole admin (ajdesign@hotmail.co.uk) is granted is_admin here so the flag is
-- never client-settable.
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
