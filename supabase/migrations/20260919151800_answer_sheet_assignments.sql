create table public.answer_sheet_assignments (
  id uuid primary key default gen_random_uuid(),
  exam_id text not null references public.exams(id) on delete restrict,
  student_id text not null references public.students(id) on delete restrict,
  class_id text not null references public.classes(id) on delete restrict,
  template_version text not null,
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  issued_by text not null references public.app_users(legacy_id) on delete restrict,
  issued_at timestamptz not null default now(),
  revoked_at timestamptz null,
  revoke_reason text null check (revoke_reason is null or char_length(btrim(revoke_reason)) between 1 and 300)
);

create unique index answer_sheet_assignments_active_student_template_key
  on public.answer_sheet_assignments(exam_id, student_id, template_version)
  where revoked_at is null;
create index answer_sheet_assignments_exam_id_idx on public.answer_sheet_assignments(exam_id);
create index answer_sheet_assignments_student_id_idx on public.answer_sheet_assignments(student_id);

alter table public.answer_sheet_assignments enable row level security;
