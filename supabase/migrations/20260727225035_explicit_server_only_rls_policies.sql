-- ProvaScan is a server-mediated application: browser clients never query the
-- Supabase Data API. Make that boundary explicit instead of relying on the
-- implicit "RLS with no policy" default, which is easy to misread in audits.
--
-- The service role remains server-only and bypasses RLS; anon/authenticated
-- retain neither table privileges nor a usable row policy.
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'answer_keys',
    'app_settings_internal',
    'app_users',
    'audit_log_internal',
    'classes',
    'correction_rules',
    'corrections',
    'exams',
    'grades',
    'operational_meta_internal',
    'psychologist_referrals',
    'student_reports',
    'students',
    'teacher_student_links',
    'tutoring_sessions'
  ] loop
    if to_regclass(format('public.%I', target_table)) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke all privileges on table public.%I from anon, authenticated', target_table);
    execute format('drop policy if exists server_only_no_direct_access on public.%I', target_table);
    execute format(
      'create policy server_only_no_direct_access on public.%I as restrictive for all to anon, authenticated using (false) with check (false)',
      target_table
    );
  end loop;
end;
$$;

-- Preserve the same least-privilege boundary for any subsequent public table.
revoke all on schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
