-- Histórico aditivo do conteúdo da prova. A versão viva continua em public.exams;
-- este registro preserva um retrato restaurável sem alterar autoria, resultados
-- ou a geometria dos cartões-resposta.
create table public.exam_content_versions (
  id uuid primary key default gen_random_uuid(),
  exam_id text not null references public.exams(id) on delete restrict,
  version integer not null check (version > 0),
  created_by text not null,
  reason text not null check (char_length(btrim(reason)) between 1 and 80),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (exam_id, version)
);

create index exam_content_versions_exam_created_idx
  on public.exam_content_versions(exam_id, created_at desc);

alter table public.exam_content_versions enable row level security;

revoke all on table public.exam_content_versions from public, anon, authenticated;
grant select, insert, update, delete on table public.exam_content_versions to service_role;

create policy "server_only_exam_content_versions"
  on public.exam_content_versions
  for all
  to anon, authenticated
  using (false)
  with check (false);
