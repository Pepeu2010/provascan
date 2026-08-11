# Segurança do Supabase

## Arquitetura em uso

O ProvaScan usa autenticação própria com cookies HTTP-only assinados. O cliente
não recebe `SUPABASE_SERVICE_ROLE_KEY` nem cria um cliente Supabase. As
operações de banco ocorrem somente em módulos marcados com `server-only`.

## Estado verificado em 2026-08-10

- O projeto Supabase ativo é `provascan` (`afgxvczkbncjfpanmddo`).
- Todas as tabelas do schema `public` têm RLS habilitado.
- As políticas para `anon` e `authenticated` negam acesso direto; o backend
  usa exclusivamente a service role no servidor.
- O Security Advisor não retornou alertas ativos.
- Não há bucket nem objeto em Supabase Storage. Não existe upload de OCR para
  proteger nesta versão.

## Regras permanentes

- Nunca prefixar `SUPABASE_SERVICE_ROLE_KEY` com `NEXT_PUBLIC_`.
- Nunca importar `services/supabase-data.ts` ou `services/collaborative-exams.ts`
  em componentes cliente.
- Toda rota que recebe um identificador deve validar a sessão e a autorização
  no servidor, antes de consultar ou alterar qualquer registro.
- Novas tabelas devem nascer com RLS, privilégios revogados de `anon` e
  `authenticated`, e uma policy explícita. Não depender de uma policy implícita.
- Toda migration deve ser revisada no SQL Editor/CI antes de ser aplicada em
  produção.

## Verificação operacional

No painel Supabase, execute Security Advisor e confirme RLS/policies após cada
migration. Revogue imediatamente uma chave service-role exposta e atualize as
variáveis da Vercel antes de republicar.
