-- RoleFit Auth project - role and company setup
--
-- Run in the SQL Editor of the Supabase project used for authentication
-- (the separate Auth project, not the Candidate Profile DB project). Safe to re-run.
--
-- The frontend signs up with:
--   supabase.auth.signUp({ email, password, options: { data: { role, name, company } } })
-- `data` lands in raw_user_meta_data, which the user can change later, so it is
-- not trusted. This trigger copies the role - and for recruiters a new company id
-- and the company name - into raw_app_meta_data once, at sign-up. Only the server
-- can write app_metadata, so these JWT claims cannot be changed by the user.
--
-- Recruiter companies: one company per recruiter account. The id is readable but
-- unguessable, e.g. "Acme Corp" -> co-acme-corp-7f3a9c. Company names are unique
-- among recruiters (case- and whitespace-insensitive).

create or replace function public.normalize_company_name(name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(trim(regexp_replace(coalesce(name, ''), '\s+', ' ', 'g')));
$$;

create or replace function public.company_slug(name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    nullif(trim(both '-' from left(trim(both '-' from regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]+', '-', 'g')), 40)), ''),
    'company'
  );
$$;

-- Lets the register page tell a recruiter the name is taken before signing up.
create or replace function public.company_name_taken(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  -- Demo company names (src/lib/companies.ts, Job Posting seed) are reserved too.
  select public.normalize_company_name(name) = any (array[
      'brightline analytics', 'harbor fintech', 'cobalt studio', 'meridian health',
      'atlas logistics', 'pinecrest software', 'lotus retail group'
    ])
    or exists (
      select 1
      from auth.users u
      where u.raw_app_meta_data ->> 'role' = 'recruiter'
        and public.normalize_company_name(u.raw_app_meta_data ->> 'company_name') = public.normalize_company_name(name)
    );
$$;

revoke all on function public.company_name_taken(text) from public;
grant execute on function public.company_name_taken(text) to anon, authenticated;

-- A new company id for a name: co-<slug>-<6 hex>, retried until no user has it.
create or replace function public.new_company_id(name text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := 'co-' || public.company_slug(name) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    exit when not exists (select 1 from auth.users u where u.raw_app_meta_data ->> 'company_id' = candidate);
  end loop;
  return candidate;
end;
$$;

revoke all on function public.new_company_id(text) from public;

create or replace function public.set_role_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
  company text := trim(coalesce(new.raw_user_meta_data ->> 'company', ''));
  extra jsonb := '{}'::jsonb;
begin
  if requested_role is null or requested_role not in ('seeker', 'recruiter') then
    raise exception 'role must be "seeker" or "recruiter"';
  end if;

  if requested_role = 'recruiter' then
    if company = '' then
      raise exception 'company is required for recruiters';
    end if;
    if public.company_name_taken(company) then
      raise exception 'company already registered';
    end if;
    extra := jsonb_build_object(
      'company_id', public.new_company_id(company),
      'company_name', company
    );
  end if;

  new.raw_app_meta_data :=
    coalesce(new.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', requested_role) || extra;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_set_role on auth.users;

create trigger on_auth_user_created_set_role
  before insert on auth.users
  for each row execute function public.set_role_on_signup();
