-- Metadado pedagógico livre por questão. Não cria catálogo de disciplinas.
alter table public.exam_questions
  add column if not exists topic text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'exam_questions_topic_length_check'
      and conrelid = 'public.exam_questions'::regclass
  ) then
    alter table public.exam_questions
      add constraint exam_questions_topic_length_check
      check (char_length(topic) <= 200);
  end if;
end;
$$;
