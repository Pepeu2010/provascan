-- Permite autorizar uma turma sem cadastrar uma disciplina ficticia.
-- Vínculos existentes por disciplina permanecem inalterados.
alter table public.pedagogical_scopes
  alter column subject_id drop not null;

-- O indice anterior continua protegendo os vinculos com disciplina.
-- NULL exige um indice separado para impedir dois vinculos gerais ativos.
create unique index if not exists pedagogical_scopes_active_class_only_unique_idx
  on public.pedagogical_scopes(user_id, class_id)
  where active and subject_id is null;
