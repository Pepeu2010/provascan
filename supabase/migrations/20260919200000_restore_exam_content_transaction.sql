-- Restaura uma versão de conteúdo em uma única transação. A aplicação e as
-- atribuições ficam fora deste RPC de propósito: elas continuam no estado atual.
create or replace function public.restore_teacher_exam_content_transaction(p_payload jsonb)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_exam jsonb := p_payload->'exam';
  v_question jsonb;
  v_exam_id text := p_payload->>'exam_id';
  v_actor_id text := p_payload->>'actor_id';
  v_expected_version integer := (p_payload->>'expected_version')::integer;
  v_next_version integer := (p_payload->>'next_version')::integer;
begin
  if coalesce(v_exam_id, '') = '' or coalesce(v_actor_id, '') = '' then
    raise exception 'Dados de restauração ausentes';
  end if;

  update public.exams
  set
    title = v_exam->>'title', description = coalesce(v_exam->>'description', ''), subject = coalesce(v_exam->>'subject', ''),
    subject_id = nullif(v_exam->>'subject_id', ''), audience_id = coalesce(v_exam->>'audience_id', ''),
    audience_label = coalesce(v_exam->>'audience_label', ''), group_type = coalesce(v_exam->>'group_type', 'GERAL'),
    year_segment = coalesce(v_exam->>'year_segment', 'OUTROS'), period = coalesce(v_exam->>'period', ''),
    exam_date = coalesce(v_exam->>'exam_date', ''), instructions = coalesce(v_exam->>'instructions', ''),
    estimated_duration = nullif(v_exam->>'estimated_duration', '')::integer, print_options = coalesce(v_exam->'print_options', '{}'::jsonb),
    alternatives = coalesce(v_exam->'alternatives', '[]'::jsonb), question_count = coalesce((v_exam->>'question_count')::integer, 0),
    code = coalesce(v_exam->>'code', ''), template_version = coalesce(v_exam->>'template_version', 'PS-CARD-4'),
    source_type = coalesce(v_exam->>'source_type', 'manual'), status = v_exam->>'status',
    original_file_name = nullif(v_exam->>'original_file_name', ''), original_file_mime_type = nullif(v_exam->>'original_file_mime_type', ''),
    original_file_size = nullif(v_exam->>'original_file_size', '')::bigint, imported_at = nullif(v_exam->>'imported_at', '')::timestamptz,
    import_processing_status = coalesce(v_exam->>'import_processing_status', 'nao_aplicavel'),
    import_processing_error = nullif(v_exam->>'import_processing_error', ''), needs_review = coalesce((v_exam->>'needs_review')::boolean, false),
    published_at = nullif(v_exam->>'published_at', '')::timestamptz, applied_at = nullif(v_exam->>'applied_at', '')::timestamptz,
    legacy_contributors = coalesce(v_exam->'legacy_contributors', '[]'::jsonb), released_at = nullif(v_exam->>'released_at', '')::timestamptz,
    version = v_next_version, updated_at = now()
  where id = v_exam_id and creator_id = v_actor_id and version = v_expected_version;

  if not found then
    raise exception 'Esta prova foi alterada em outra sessão. Recarregue antes de restaurar.';
  end if;

  delete from public.answer_keys where exam_id = v_exam_id;
  delete from public.exam_questions where exam_id = v_exam_id;

  for v_question in select value from jsonb_array_elements(coalesce(p_payload->'questions', '[]'::jsonb)) loop
    insert into public.exam_questions (id, exam_id, position, type, prompt, alternatives, correct_answers, weight, annulled, correction_criteria, correction_notes, needs_review, image_path)
    values (
      v_question->>'id', v_exam_id, (v_question->>'position')::integer, v_question->>'type',
      coalesce(v_question->>'prompt', ''), coalesce(v_question->'alternatives', '[]'::jsonb),
      coalesce(v_question->'correct_answers', '[]'::jsonb), coalesce((v_question->>'weight')::numeric, 1),
      coalesce((v_question->>'annulled')::boolean, false), coalesce(v_question->>'correction_criteria', ''),
      coalesce(v_question->>'correction_notes', ''), coalesce((v_question->>'needs_review')::boolean, false), nullif(v_question->>'image_path', '')
    );
    insert into public.answer_keys (exam_id, question_number, correct_answer)
    values (v_exam_id, (v_question->>'position')::integer,
      case when coalesce((v_question->>'annulled')::boolean, false) then 'ANULADA' else coalesce(nullif(v_question->'correct_answers'->>0, ''), 'CORRECAO_MANUAL') end);
  end loop;

  insert into public.correction_rules (exam_id, max_score, rounding_places, default_weight, weights_by_question, voided_questions, voided_question_mode)
  values (v_exam_id, coalesce((p_payload->>'max_score')::numeric, 10), 1, 1,
    coalesce(p_payload->'weights_by_question', '[]'::jsonb), coalesce(p_payload->'voided_questions', '[]'::jsonb), 'full-credit')
  on conflict (exam_id) do update set
    max_score = excluded.max_score, rounding_places = excluded.rounding_places, default_weight = excluded.default_weight,
    weights_by_question = excluded.weights_by_question, voided_questions = excluded.voided_questions,
    voided_question_mode = excluded.voided_question_mode;

  update public.exam_sections
  set question_count = greatest(coalesce((v_exam->>'question_count')::integer, 0), 1), subject = coalesce(v_exam->>'subject', 'Geral')
  where exam_id = v_exam_id and teacher_id = v_actor_id;

  insert into public.exam_content_versions (id, exam_id, version, created_by, reason, snapshot)
  values (p_payload->>'version_id', v_exam_id, v_next_version, v_actor_id, 'restaurada', coalesce(p_payload->'snapshot', '{}'::jsonb));

  return v_next_version;
end;
$$;

revoke all on function public.restore_teacher_exam_content_transaction(jsonb) from public, anon, authenticated;
grant execute on function public.restore_teacher_exam_content_transaction(jsonb) to service_role;
