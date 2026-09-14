create table if not exists public.external_exam_templates (
  id uuid primary key,
  owner_id text not null,
  name text not null check (char_length(name) between 1 and 200),
  structure jsonb not null,
  answer_key jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists external_exam_templates_owner_updated_idx
  on public.external_exam_templates(owner_id, updated_at desc);

create table if not exists public.external_corrections (
  id uuid primary key,
  template_id uuid references public.external_exam_templates(id) on delete set null,
  owner_id text not null,
  student_name text not null check (char_length(student_name) between 1 and 160),
  source_label text not null check (char_length(source_label) between 1 and 260),
  structure_snapshot jsonb not null,
  answer_key_snapshot jsonb not null,
  answers jsonb not null,
  summary jsonb not null,
  corrected_at timestamptz not null default now()
);

create index if not exists external_corrections_owner_corrected_idx
  on public.external_corrections(owner_id, corrected_at desc);

alter table public.external_exam_templates enable row level security;
alter table public.external_corrections enable row level security;

drop policy if exists server_only_external_exam_templates on public.external_exam_templates;
create policy server_only_external_exam_templates
  on public.external_exam_templates as restrictive for all to anon, authenticated
  using (false) with check (false);

drop policy if exists server_only_external_corrections on public.external_corrections;
create policy server_only_external_corrections
  on public.external_corrections as restrictive for all to anon, authenticated
  using (false) with check (false);

revoke all on table public.external_exam_templates from anon, authenticated;
revoke all on table public.external_corrections from anon, authenticated;
