-- One-time backfill: give recruiters who signed up before company ids existed a
-- company_id and company_name. Run AFTER auth-setup.sql. Safe to re-run (only
-- touches recruiters without a company_id). Existing duplicate names are kept as
-- separate companies. Affected users must sign out and in again to get the new claims.

update auth.users u
set raw_app_meta_data =
  coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
    'company_id', 'co-' || public.company_slug(u.raw_user_meta_data ->> 'company') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
    'company_name', coalesce(nullif(trim(u.raw_user_meta_data ->> 'company'), ''), 'Company')
  )
where u.raw_app_meta_data ->> 'role' = 'recruiter'
  and coalesce(u.raw_app_meta_data ->> 'company_id', '') = '';

-- Check the result:
select email, raw_app_meta_data ->> 'company_id' as company_id, raw_app_meta_data ->> 'company_name' as company_name
from auth.users
where raw_app_meta_data ->> 'role' = 'recruiter';
