-- Fundação aditiva do Sistema de Provas V2.
-- Não converte nem reescreve o campo textual exams.subject nesta etapa.

create table if not exists public.subjects (
  id text primary key,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  normalized_name text generated always as (lower(btrim(name))) stored,
  active boolean not null default true,
  created_by text references public.app_users(legacy_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (normalized_name)
);

alter table public.exams
  add column if not exists subject_id text references public.subjects(id) on delete restrict;

create index if not exists exams_subject_id_idx
  on public.exams(subject_id)
  where subject_id is not null;

create table if not exists public.pedagogical_scopes (
  id text primary key,
  user_id text not null references public.app_users(legacy_id) on delete restrict,
  subject_id text not null references public.subjects(id) on delete restrict,
  class_id text not null references public.classes(id) on delete restrict,
  granted_by text references public.app_users(legacy_id) on delete set null,
  granted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  active boolean not null default true,
  archived_at timestamptz,
  check ((active and archived_at is null) or (not active and archived_at is not null))
);

create unique index if not exists pedagogical_scopes_active_unique_idx
  on public.pedagogical_scopes(user_id, subject_id, class_id)
  where active;

create index if not exists pedagogical_scopes_user_active_idx
  on public.pedagogical_scopes(user_id, subject_id, class_id)
  where active;

create index if not exists pedagogical_scopes_class_active_idx
  on public.pedagogical_scopes(class_id, subject_id)
  where active;

alter table public.subjects enable row level security;
alter table public.pedagogical_scopes enable row level security;

revoke all on public.subjects, public.pedagogical_scopes from anon, authenticated;

drop policy if exists server_only_subjects on public.subjects;
create policy server_only_subjects
  on public.subjects as restrictive for all to anon, authenticated
  using (false) with check (false);

drop policy if exists server_only_pedagogical_scopes on public.pedagogical_scopes;
create policy server_only_pedagogical_scopes
  on public.pedagogical_scopes as restrictive for all to anon, authenticated
  using (false) with check (false);

grant select, insert, update, delete on public.subjects, public.pedagogical_scopes to service_role;

select private.install_touch_trigger('public.subjects'::regclass);
select private.install_touch_trigger('public.pedagogical_scopes'::regclass);
