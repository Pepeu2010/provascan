create or replace function public.replace_operational_state(
  payload jsonb,
  actor_id text,
  expected_revision bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_revision bigint;
  next_revision bigint;
begin
  select revision into current_revision
  from public.operational_meta_internal
  where singleton = true
  for update;

  if current_revision is null then
    current_revision := 0;
    insert into public.operational_meta_internal(singleton, revision, updated_by, state_hash)
    values (true, current_revision, 'system', '');
  end if;

  if current_revision <> expected_revision then
    raise exception 'REVISION_CONFLICT' using errcode = '40001';
  end if;

  delete from public.corrections;
  delete from public.correction_rules;
  delete from public.answer_keys;
  delete from public.students;
  delete from public.exams;
  delete from public.classes;

  insert into public.classes (id, name, teacher, academic_year, period, audience_id, audience_label, group_type, year_segment)
  select item->>'id', item->>'nome', coalesce(item->>'professor', ''), coalesce(item->>'ano', ''), coalesce(item->>'periodo', ''),
    coalesce(item->>'audienceId', ''), coalesce(item->>'audienceLabel', ''), coalesce(item->>'groupType', ''), coalesce(item->>'yearSegment', '')
  from jsonb_array_elements(coalesce(payload->'classes', '[]'::jsonb)) item;

  insert into public.students (id, name, class_id, registration, status)
  select item->>'id', item->>'nome', nullif(item->>'turma', ''), coalesce(item->>'matricula', ''), coalesce(item->>'status', 'Ativo')
  from jsonb_array_elements(coalesce(payload->'students', '[]'::jsonb)) item;

  insert into public.exams (id, title, subject, audience_id, audience_label, group_type, year_segment, question_count, alternatives, exam_date, code, template_version)
  select item->>'id', item->>'titulo', coalesce(item->>'subject', ''), coalesce(item->>'audienceId', ''), coalesce(item->>'audienceLabel', ''),
    coalesce(item->>'groupType', ''), coalesce(item->>'yearSegment', ''), coalesce((item->>'quantidadeQuestoes')::integer, 0),
    coalesce(item->'alternativas', '[]'::jsonb), coalesce(item->>'data', ''), coalesce(item->>'codigo', ''), coalesce(item->>'templateVersion', 'PS-CARD-1')
  from jsonb_array_elements(coalesce(payload->'exams', '[]'::jsonb)) item;

  insert into public.answer_keys (exam_id, question_number, correct_answer)
  select item->>'provaId', (item->>'questao')::integer, item->>'respostaCorreta'
  from jsonb_array_elements(coalesce(payload->'answerKeys', '[]'::jsonb)) item;

  insert into public.correction_rules (exam_id, max_score, rounding_places, default_weight, weights_by_question, voided_questions, voided_question_mode)
  select item->>'provaId', coalesce((item->>'notaMaxima')::numeric, 10), coalesce((item->>'arredondamentoCasas')::integer, 1),
    coalesce((item->>'pesoPadrao')::numeric, 1), coalesce(item->'pesosPorQuestao', '[]'::jsonb),
    coalesce(item->'questoesAnuladas', '[]'::jsonb), coalesce(item->>'modoQuestaoAnulada', 'full-credit')
  from jsonb_array_elements(coalesce(payload->'correctionRules', '[]'::jsonb)) item;

  insert into public.corrections (
    id, exam_id, student_id, detected_name, score, correct_count, incorrect_count, blank_count, multiple_marks_count, voided_count,
    percentage, corrected_at, source_image, correction_time, identification_method, student_snapshot, exam_snapshot, class_snapshot,
    answers, ocr_confidence, processed_image, observations, identification
  )
  select
    item->'correction'->>'id', item->'correction'->>'provaId', nullif(item->'correction'->>'alunoId', ''),
    coalesce(item->'correction'->>'nomeDetectado', ''), coalesce((item->'correction'->>'nota')::numeric, 0),
    coalesce((item->'correction'->>'acertos')::integer, 0), coalesce((item->'correction'->>'erros')::integer, 0),
    coalesce((item->'correction'->>'emBranco')::integer, 0), coalesce((item->'correction'->>'multiplasMarcacoes')::integer, 0),
    coalesce((item->'correction'->>'anuladas')::integer, 0), coalesce((item->'correction'->>'percentual')::numeric, 0),
    coalesce(item->'correction'->>'data', ''), coalesce(item->'correction'->>'imagem', ''), coalesce(item->'correction'->>'tempoCorrecao', ''),
    coalesce(item->'correction'->>'metodoIdentificacao', 'manual'), coalesce(item->'aluno', '{}'::jsonb), coalesce(item->'prova', '{}'::jsonb),
    coalesce(item->'turma', '{}'::jsonb), coalesce(item->'respostas', '[]'::jsonb), coalesce((item->>'confiancaOcr')::numeric, 0),
    coalesce(item->>'imagemProcessada', ''), coalesce(item->'observacoes', '[]'::jsonb), coalesce(item->'identificacao', '{}'::jsonb)
  from jsonb_array_elements(coalesce(payload->'corrections', '[]'::jsonb)) item;

  delete from public.app_settings_internal;
  insert into public.app_settings_internal(key, value)
  values
    ('teacher_nome', coalesce(payload->'teacherProfile'->>'nome', '')),
    ('teacher_email', coalesce(payload->'teacherProfile'->>'email', '')),
    ('teacher_escola', coalesce(payload->'teacherProfile'->>'escola', ''));

  next_revision := current_revision + 1;
  update public.operational_meta_internal
  set revision = next_revision, updated_at = now(), updated_by = actor_id,
    state_hash = encode(digest(payload::text, 'sha256'), 'hex')
  where singleton = true;

  return next_revision;
end;
$$;

revoke all on function public.replace_operational_state(jsonb, text, bigint) from public, anon, authenticated;
grant execute on function public.replace_operational_state(jsonb, text, bigint) to service_role;
