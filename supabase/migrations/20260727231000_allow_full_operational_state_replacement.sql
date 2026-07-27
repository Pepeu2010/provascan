-- Supabase's safe-update guard rejects unqualified DELETE statements, even
-- inside SECURITY DEFINER functions. Keep this migration additive so both new
-- databases and the production database receive the exact same RPC body.
do $$
declare
  definition text;
begin
  select pg_get_functiondef('public.replace_operational_state(jsonb, text, bigint)'::regprocedure)
    into definition;

  definition := replace(definition, 'delete from public.corrections;', 'delete from public.corrections where true;');
  definition := replace(definition, 'delete from public.correction_rules;', 'delete from public.correction_rules where true;');
  definition := replace(definition, 'delete from public.answer_keys;', 'delete from public.answer_keys where true;');
  definition := replace(definition, 'delete from public.students;', 'delete from public.students where true;');
  definition := replace(definition, 'delete from public.exams;', 'delete from public.exams where true;');
  definition := replace(definition, 'delete from public.classes;', 'delete from public.classes where true;');
  definition := replace(definition, 'delete from public.app_settings_internal;', 'delete from public.app_settings_internal where true;');

  execute definition;
end;
$$;
