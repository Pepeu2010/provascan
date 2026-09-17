-- Publicação V2: uma prova publicada não pode existir sem seu conteúdo,
-- gabarito, regras, atribuições e registro de auditoria.
create or replace function public.create_teacher_exam_transaction(p_payload jsonb)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_exam jsonb := p_payload->'exam';
  v_question jsonb;
  v_assignment jsonb;
  v_exam_id text := v_exam->>'id';
begin
  if coalesce(v_exam_id, '') = '' then
    raise exception 'Identificador da prova ausente';
  end if;

  insert into public.exams (
    id, title, subject, subject_id, audience_id, audience_label, group_type,
    year_segment, question_count, alternatives, exam_date, code,
    template_version, description, instructions, period, estimated_duration,
    creator_id, source_type, status, original_file_name,
    original_file_mime_type, original_file_size, imported_at,
    import_processing_status, import_processing_error, needs_review, version,
    published_at, applied_at, legacy_contributors, released_at
  ) values (
    v_exam_id, v_exam->>'title', v_exam->>'subject', nullif(v_exam->>'subject_id', ''),
    coalesce(v_exam->>'audience_id', ''), coalesce(v_exam->>'audience_label', ''),
    coalesce(v_exam->>'group_type', 'GERAL'), coalesce(v_exam->>'year_segment', 'OUTROS'),
    coalesce((v_exam->>'question_count')::integer, 0), coalesce(v_exam->'alternatives', '[]'::jsonb),
    coalesce(v_exam->>'exam_date', ''), coalesce(v_exam->>'code', ''),
    coalesce(v_exam->>'template_version', 'PS-CARD-4'), coalesce(v_exam->>'description', ''),
    coalesce(v_exam->>'instructions', ''), coalesce(v_exam->>'period', ''),
    nullif(v_exam->>'estimated_duration', '')::integer, v_exam->>'creator_id',
    coalesce(v_exam->>'source_type', 'manual'), v_exam->>'status',
    nullif(v_exam->>'original_file_name', ''), nullif(v_exam->>'original_file_mime_type', ''),
    nullif(v_exam->>'original_file_size', '')::bigint, nullif(v_exam->>'imported_at', '')::timestamptz,
    coalesce(v_exam->>'import_processing_status', 'nao_aplicavel'),
    nullif(v_exam->>'import_processing_error', ''), coalesce((v_exam->>'needs_review')::boolean, false),
    coalesce((v_exam->>'version')::integer, 1), nullif(v_exam->>'published_at', '')::timestamptz,
    nullif(v_exam->>'applied_at', '')::timestamptz, coalesce(v_exam->'legacy_contributors', '[]'::jsonb),
    nullif(v_exam->>'released_at', '')::timestamptz
  );

  insert into public.exam_sections (id, exam_id, question_start, question_count, subject, teacher_id, teacher_name)
  values (p_payload->>'section_id', v_exam_id, 1, greatest(coalesce((v_exam->>'question_count')::integer, 0), 1), v_exam->>'subject', v_exam->>'creator_id', p_payload->>'creator_name');

  for v_question in select value from jsonb_array_elements(coalesce(p_payload->'questions', '[]'::jsonb)) loop
    insert into public.exam_questions (id, exam_id, position, type, prompt, alternatives, correct_answers, weight, annulled, correction_criteria, correction_notes, needs_review, image_path)
    values (
      v_question->>'id', v_exam_id, (v_question->>'position')::integer, v_question->>'type',
      coalesce(v_question->>'prompt', ''), coalesce(v_question->'alternatives', '[]'::jsonb),
      coalesce(v_question->'correct_answers', '[]'::jsonb), coalesce((v_question->>'weight')::numeric, 1),
      coalesce((v_question->>'annulled')::boolean, false), coalesce(v_question->>'correction_criteria', ''),
      coalesce(v_question->>'correction_notes', ''), coalesce((v_question->>'needs_review')::boolean, false),
      nullif(v_question->>'image_path', '')
    );
    insert into public.answer_keys (exam_id, question_number, correct_answer)
    values (v_exam_id, (v_question->>'position')::integer,
      case when coalesce((v_question->>'annulled')::boolean, false) then 'ANULADA' else coalesce(nullif(v_question->'correct_answers'->>0, ''), 'CORRECAO_MANUAL') end);
  end loop;

  insert into public.correction_rules (exam_id, max_score, rounding_places, default_weight, weights_by_question, voided_questions, voided_question_mode)
  values (v_exam_id, coalesce((p_payload->>'max_score')::numeric, 10), 1, 1,
    coalesce(p_payload->'weights_by_question', '[]'::jsonb), coalesce(p_payload->'voided_questions', '[]'::jsonb), 'full-credit');

  for v_assignment in select value from jsonb_array_elements(coalesce(p_payload->'assignments', '[]'::jsonb)) loop
    insert into public.exam_assignments (id, exam_id, teacher_id, class_id, assigned_by, active, archived_at)
    values (v_assignment->>'id', v_exam_id, v_assignment->>'teacher_id', v_assignment->>'class_id', v_exam->>'creator_id', true, null);
  end loop;

  insert into public.audit_log_internal (id, occurred_at, actor_id, event, target_id, metadata)
  values (p_payload->>'audit_id', now(), v_exam->>'creator_id', p_payload->>'audit_event', v_exam_id, coalesce(p_payload->'audit_metadata', '{}'::jsonb));

  return v_exam_id;
end;
$$;

revoke all on function public.create_teacher_exam_transaction(jsonb) from public, anon, authenticated;
grant execute on function public.create_teacher_exam_transaction(jsonb) to service_role;
