-- RoleFit Auth project - role setup
--
-- Run once in the SQL Editor of the Supabase project used for authentication
-- (the separate Auth project, not the Candidate Profile DB project).
--
-- The frontend signs up with:
--   supabase.auth.signUp({ email, password, options: { data: { role, name, company } } })
-- `data` lands in raw_user_meta_data, which the user can change later, so it is
-- not trusted. This trigger copies the role into raw_app_meta_data once, at
-- sign-up. Only the server can write app_metadata, so the role in the JWT
-- (app_metadata.role) cannot be changed by the user afterwards.

create or replace function public.set_role_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  if requested_role is null or requested_role not in ('seeker', 'recruiter') then
    raise exception 'role must be "seeker" or "recruiter"';
  end if;

  new.raw_app_meta_data :=
    coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', requested_role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_set_role on auth.users;

create trigger on_auth_user_created_set_role
  before insert on auth.users
  for each row execute function public.set_role_on_signup();
