-- Adesivos carregam identificadores opacos; só serviços de backend podem
-- consultar ou alterar a tabela. O navegador nunca recebe acesso direto.
alter table public.answer_sheet_assignments enable row level security;

drop policy if exists server_only_answer_sheet_assignments on public.answer_sheet_assignments;
create policy server_only_answer_sheet_assignments
  on public.answer_sheet_assignments
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.answer_sheet_assignments from public, anon, authenticated;
grant select, insert, update, delete on table public.answer_sheet_assignments to service_role;
