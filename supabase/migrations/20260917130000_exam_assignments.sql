-- Atribuições são responsabilidade operacional, não autoria da prova.
create table if not exists public.exam_assignments (
  id text primary key,
  exam_id text not null references public.exams(id) on delete restrict,
  teacher_id text not null references public.app_users(legacy_id) on delete restrict,
  class_id text not null references public.classes(id) on delete restrict,
  assigned_by text references public.app_users(legacy_id) on delete set null,
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  active boolean not null default true,
  archived_at timestamptz,
  check ((active and archived_at is null) or (not active and archived_at is not null))
);

create unique index if not exists exam_assignments_active_unique_idx
  on public.exam_assignments(exam_id, teacher_id, class_id)
  where active;
create index if not exists exam_assignments_exam_active_idx on public.exam_assignments(exam_id) where active;
create index if not exists exam_assignments_teacher_active_idx on public.exam_assignments(teacher_id) where active;
create index if not exists exam_assignments_class_active_idx on public.exam_assignments(class_id) where active;
create index if not exists exam_assignments_assigned_by_idx on public.exam_assignments(assigned_by);

alter table public.exam_assignments enable row level security;
revoke all on public.exam_assignments from anon, authenticated;
drop policy if exists server_only_exam_assignments on public.exam_assignments;
create policy server_only_exam_assignments on public.exam_assignments as restrictive for all to anon, authenticated using (false) with check (false);
grant select, insert, update, delete on public.exam_assignments to service_role;
select private.install_touch_trigger('public.exam_assignments'::regclass);
