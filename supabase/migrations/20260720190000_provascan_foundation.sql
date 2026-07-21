-- ProvaScan: fonte de verdade operacional e de segurança.
-- O aplicativo acessa estes dados somente pelo servidor. Nenhuma tabela recebe
-- política permissiva para anon/authenticated; RLS permanece como defesa extra.

create schema if not exists private;

revoke all on schema public from anon, authenticated;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.users (
  legacy_id text primary key,
  access_key text not null unique,
  full_name text not null,
  role text not null,
  subject text not null default '',
  password_hash text not null,
  active boolean not null default true,
  force_password_change boolean not null default true,
  mfa_active boolean not null default false,
  mfa_method text not null default '' check (mfa_method in ('', 'TOTP')),
  mfa_secret_encrypted text not null default '',
  recovery_codes_hashes jsonb not null default '[]'::jsonb,
  password_changed_at timestamptz,
  mfa_configured_at timestamptz,
  last_mfa_at timestamptz,
  last_login_at timestamptz,
  mfa_failures integer not null default 0 check (mfa_failures >= 0),
  sessions_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.classes (
  id text primary key,
  name text not null,
  teacher text not null default '',
  academic_year text not null default '',
  period text not null default '',
  audience_id text not null default '',
  audience_label text not null default '',
  group_type text not null default '',
  year_segment text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id text primary key,
  name text not null,
  class_id text references public.classes(id) on delete set null,
  registration text not null default '',
  status text not null default 'Ativo',
  updated_at timestamptz not null default now()
);

create table if not exists public.exams (
  id text primary key,
  title text not null,
  subject text not null default '',
  audience_id text not null default '',
  audience_label text not null default '',
  group_type text not null default '',
  year_segment text not null default '',
  question_count integer not null default 0 check (question_count >= 0),
  alternatives jsonb not null default '[]'::jsonb,
  exam_date text not null default '',
  code text not null default '',
  template_version text not null default 'PS-CARD-1',
  updated_at timestamptz not null default now()
);

create table if not exists public.answer_keys (
  exam_id text not null references public.exams(id) on delete cascade,
  question_number integer not null check (question_number > 0),
  correct_answer text not null,
  primary key (exam_id, question_number)
);

create table if not exists public.correction_rules (
  exam_id text primary key references public.exams(id) on delete cascade,
  max_score numeric(8,2) not null default 10,
  rounding_places integer not null default 1 check (rounding_places between 0 and 6),
  default_weight numeric(10,4) not null default 1,
  weights_by_question jsonb not null default '[]'::jsonb,
  voided_questions jsonb not null default '[]'::jsonb,
  voided_question_mode text not null default 'full-credit',
  updated_at timestamptz not null default now()
);

create table if not exists public.corrections (
  id text primary key,
  exam_id text not null references public.exams(id) on delete restrict,
  student_id text references public.students(id) on delete set null,
  detected_name text not null default '',
  score numeric(8,2) not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  blank_count integer not null default 0,
  multiple_marks_count integer not null default 0,
  voided_count integer not null default 0,
  percentage numeric(7,3) not null default 0,
  corrected_at text not null default '',
  source_image text not null default '',
  correction_time text not null default '',
  identification_method text not null default 'manual',
  student_snapshot jsonb not null default '{}'::jsonb,
  exam_snapshot jsonb not null default '{}'::jsonb,
  class_snapshot jsonb not null default '{}'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  ocr_confidence numeric(7,4) not null default 0,
  processed_image text not null default '',
  observations jsonb not null default '[]'::jsonb,
  identification jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists private.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists private.operational_meta (
  singleton boolean primary key default true check (singleton),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  updated_by text not null default 'system',
  state_hash text not null default ''
);

create table if not exists private.audit_log (
  id text primary key,
  occurred_at timestamptz not null,
  actor_id text not null default '',
  event text not null,
  target_id text not null default '',
  ip_hash text not null default '',
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists private.legacy_sheet_archive (
  tab_name text not null,
  row_number integer not null check (row_number > 0),
  headers jsonb not null,
  values jsonb not null,
  imported_at timestamptz not null default now(),
  primary key (tab_name, row_number)
);

create table if not exists private.migration_runs (
  name text primary key,
  source_fingerprint text not null,
  completed_at timestamptz not null default now(),
  summary jsonb not null default '{}'::jsonb
);

create index if not exists students_class_id_idx on public.students(class_id);
create index if not exists exams_subject_idx on public.exams(subject);
create index if not exists corrections_exam_id_idx on public.corrections(exam_id);
create index if not exists corrections_student_id_idx on public.corrections(student_id);
create index if not exists audit_log_occurred_at_idx on private.audit_log(occurred_at desc);

alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.exams enable row level security;
alter table public.answer_keys enable row level security;
alter table public.correction_rules enable row level security;
alter table public.corrections enable row level security;
alter table private.users enable row level security;
alter table private.app_settings enable row level security;
alter table private.operational_meta enable row level security;
alter table private.audit_log enable row level security;
alter table private.legacy_sheet_archive enable row level security;
alter table private.migration_runs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema private revoke all on tables from public, anon, authenticated;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.install_touch_trigger(target regclass)
returns void
language plpgsql
set search_path = ''
as $$
begin
  execute format('drop trigger if exists set_updated_at on %s', target);
  execute format('create trigger set_updated_at before update on %s for each row execute function private.touch_updated_at()', target);
end;
$$;

select private.install_touch_trigger('private.users'::regclass);
select private.install_touch_trigger('public.classes'::regclass);
select private.install_touch_trigger('public.students'::regclass);
select private.install_touch_trigger('public.exams'::regclass);
select private.install_touch_trigger('public.correction_rules'::regclass);
select private.install_touch_trigger('public.corrections'::regclass);
select private.install_touch_trigger('private.app_settings'::regclass);

revoke all on function private.touch_updated_at() from public;
revoke all on function private.install_touch_trigger(regclass) from public;
