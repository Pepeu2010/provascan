-- Professores passam a criar, editar e publicar as próprias provas diretamente.
-- A migração preserva provas, gabaritos, correções e a autoria disponível no
-- antigo particionamento por professor, removendo somente o estado de aprovação.

alter table public.exams
  add column if not exists description text not null default '',
  add column if not exists instructions text not null default '',
  add column if not exists period text not null default '',
  add column if not exists estimated_duration integer,
  add column if not exists creator_id text,
  add column if not exists source_type text not null default 'manual',
  add column if not exists status text not null default 'rascunho',
  add column if not exists original_file_name text,
  add column if not exists original_file_mime_type text,
  add column if not exists original_file_size bigint,
  add column if not exists imported_at timestamptz,
  add column if not exists import_processing_status text not null default 'nao_aplicavel',
  add column if not exists import_processing_error text,
  add column if not exists needs_review boolean not null default false,
  add column if not exists version integer not null default 1,
  add column if not exists published_at timestamptz,
  add column if not exists applied_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists legacy_contributors jsonb not null default '[]'::jsonb;

update public.exams exam
set creator_id = coalesce(
  (
    select section.teacher_id
    from public.exam_sections section
    where section.exam_id = exam.id
    order by section.question_start, section.created_at
    limit 1
  ),
  'legacy-operational'
)
where creator_id is null or trim(creator_id) = '';

update public.exams exam
set subject = coalesce(nullif(trim(exam.subject), ''), (
  select section.subject
  from public.exam_sections section
  where section.exam_id = exam.id
  order by section.question_start, section.created_at
  limit 1
), '')
where trim(exam.subject) = '';

update public.exams exam
set legacy_contributors = coalesce((
  select jsonb_agg(jsonb_build_object(
    'teacherId', section.teacher_id,
    'teacherName', section.teacher_name,
    'subject', section.subject
  ) order by section.question_start)
  from public.exam_sections section
  where section.exam_id = exam.id
), '[]'::jsonb)
where legacy_contributors = '[]'::jsonb;

update public.exams exam
set status = case
  when exists (select 1 from public.corrections correction where correction.exam_id = exam.id) then 'aplicada'
  when exam.released_at is not null then 'publicada'
  else 'rascunho'
end,
published_at = coalesce(exam.published_at, exam.released_at),
applied_at = coalesce(exam.applied_at, (
  select min(nullif(correction.corrected_at, '')::timestamptz)
  from public.corrections correction
  where correction.exam_id = exam.id
));

alter table public.exams alter column creator_id set not null;
alter table public.exams alter column creator_id set default 'legacy-operational';
alter table public.exams drop constraint if exists exams_status_check;
alter table public.exams add constraint exams_status_check check (status in ('rascunho', 'publicada', 'aplicada', 'arquivada'));
alter table public.exams drop constraint if exists exams_source_type_check;
alter table public.exams add constraint exams_source_type_check check (source_type in ('manual', 'pdf', 'doc', 'docx', 'imagem'));
alter table public.exams drop constraint if exists exams_import_processing_status_check;
alter table public.exams add constraint exams_import_processing_status_check check (import_processing_status in ('nao_aplicavel', 'processando', 'pronto', 'erro'));
alter table public.exams drop constraint if exists exams_estimated_duration_check;
alter table public.exams add constraint exams_estimated_duration_check check (estimated_duration is null or estimated_duration between 1 and 600);
alter table public.exams drop constraint if exists exams_version_check;
alter table public.exams add constraint exams_version_check check (version > 0);

create index if not exists exams_creator_status_updated_idx
  on public.exams(creator_id, status, updated_at desc);

create table if not exists public.exam_questions (
  id text primary key,
  exam_id text not null references public.exams(id) on delete cascade,
  position integer not null check (position between 1 and 200),
  type text not null default 'multipla_escolha' check (type in ('multipla_escolha', 'verdadeiro_falso', 'resposta_curta', 'discursiva', 'associacao')),
  prompt text not null default '',
  alternatives jsonb not null default '[]'::jsonb,
  correct_answers jsonb not null default '[]'::jsonb,
  weight numeric(10,4) not null default 1 check (weight >= 0),
  annulled boolean not null default false,
  correction_criteria text not null default '',
  correction_notes text not null default '',
  needs_review boolean not null default false,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, position)
);

insert into public.exam_questions (
  id, exam_id, position, type, prompt, alternatives, correct_answers,
  weight, annulled, correction_criteria, correction_notes, needs_review
)
select
  answer.exam_id || '-q-' || answer.question_number,
  answer.exam_id,
  answer.question_number,
  'multipla_escolha',
  'Questão ' || answer.question_number,
  exam.alternatives,
  jsonb_build_array(answer.correct_answer),
  coalesce((
    select (weight_item->>'peso')::numeric
    from public.correction_rules rule,
      jsonb_array_elements(coalesce(rule.weights_by_question, '[]'::jsonb)) weight_item
    where rule.exam_id = answer.exam_id
      and (weight_item->>'questao')::integer = answer.question_number
    limit 1
  ), 1),
  exists (
    select 1
    from public.correction_rules rule
    where rule.exam_id = answer.exam_id
      and rule.voided_questions @> to_jsonb(array[answer.question_number])
  ),
  '',
  'Questão migrada do gabarito anterior; o enunciado original não estava armazenado.',
  true
from public.answer_keys answer
join public.exams exam on exam.id = answer.exam_id
on conflict (exam_id, position) do nothing;

create index if not exists exam_questions_exam_position_idx on public.exam_questions(exam_id, position);
alter table public.exam_questions enable row level security;
drop policy if exists server_only_exam_questions on public.exam_questions;
create policy server_only_exam_questions on public.exam_questions as restrictive for all to anon, authenticated using (false) with check (false);
revoke all on table public.exam_questions from anon, authenticated;
grant select, insert, update, delete on table public.exam_questions to service_role;
select private.install_touch_trigger('public.exam_questions'::regclass);

create table if not exists public.exam_files (
  id uuid primary key,
  exam_id text not null references public.exams(id) on delete cascade,
  owner_id text not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 15728640),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  unique (owner_id, sha256)
);

create index if not exists exam_files_exam_idx on public.exam_files(exam_id);
alter table public.exam_files enable row level security;
drop policy if exists server_only_exam_files on public.exam_files;
create policy server_only_exam_files on public.exam_files as restrictive for all to anon, authenticated using (false) with check (false);
revoke all on table public.exam_files from anon, authenticated;
grant select, insert, update, delete on table public.exam_files to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exam-imports',
  'exam-imports',
  false,
  15728640,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- O criador vem sempre da sessão no backend e não pode ser trocado por payload.
create or replace function private.prevent_exam_creator_change()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if old.creator_id is distinct from new.creator_id then
    raise exception 'EXAM_CREATOR_IMMUTABLE';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_exam_creator_change on public.exams;
create trigger prevent_exam_creator_change
before update of creator_id on public.exams
for each row execute function private.prevent_exam_creator_change();

-- Remove o estado e a trilha de aprovação, preservando apenas autoria/divisão
-- histórica das antigas provas colaborativas.
drop index if exists public.exam_sections_teacher_id_idx;
alter table public.exam_sections
  drop column if exists status,
  drop column if exists review_note,
  drop column if exists submitted_at,
  drop column if exists reviewed_at,
  drop column if exists reviewed_by;
create index if not exists exam_sections_teacher_exam_idx on public.exam_sections(teacher_id, exam_id);

drop function if exists public.delete_collaborative_exam(text);
