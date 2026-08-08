-- The previous operational exams were test fixtures. Remove them before
-- enabling the teacher-owned answer-key workflow requested by the school.
delete from public.corrections where true;
delete from public.correction_rules where true;
delete from public.answer_keys where true;
delete from public.exams where true;

alter table public.exams add column if not exists released_at timestamptz;

create table if not exists public.exam_sections (
  id text primary key,
  exam_id text not null references public.exams(id) on delete cascade,
  subject text not null check (length(trim(subject)) > 0),
  teacher_id text not null,
  teacher_name text not null default '',
  question_start integer not null check (question_start > 0),
  question_count integer not null check (question_count > 0),
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'devolvido')),
  review_note text not null default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, question_start)
);

create index if not exists exam_sections_exam_id_idx on public.exam_sections(exam_id);
create index if not exists exam_sections_teacher_id_idx on public.exam_sections(teacher_id, status);

alter table public.exam_sections enable row level security;
revoke all on public.exam_sections from anon, authenticated;
grant select, insert, update, delete on public.exam_sections to service_role;

select private.install_touch_trigger('public.exam_sections'::regclass);
