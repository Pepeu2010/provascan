# Modelo de RLS

## Decisão atual: banco interno, não API pública

As identidades da aplicação não são usuários do Supabase Auth. Por isso, não é
seguro escrever policies baseadas em `auth.uid()` como se o cliente acessasse o
banco diretamente. A proteção correta nesta arquitetura é:

1. RLS habilitado em todas as tabelas públicas.
2. `anon` e `authenticated` sem privilégios e com policy de negação explícita.
3. Service role acessível apenas por Route Handlers e serviços `server-only`.
4. Autorização por sessão, papel e vínculo do recurso no servidor.

Isso evita o bypass por Data API e mantém as regras de professor, coordenação e
admin em uma única camada auditável.

## Regras de autorização aplicadas

- Professor cria, lê, edita, publica e arquiva somente provas cujo `creator_id` é o seu id.
- O `creator_id` vem da sessão no servidor e um trigger impede sua troca posterior.
- Coordenação/admin consulta provas institucionais, sem etapa de aprovação ou liberação.
- Arquivos importados ficam em bucket privado e são entregues somente por URL assinada após autorização.
- Professores não recebem nem gravam o snapshot operacional completo.
- Endpoints administrativos exigem papel privilegiado no servidor.

## Se migrar para Supabase Auth no futuro

Antes de abrir qualquer tabela ao cliente, migre os usuários, garanta que os
IDs da aplicação correspondam a `auth.uid()`, escreva policies por linha e crie
testes de acesso cruzado. Não misture o modelo atual de service role com
policies permissivas baseadas em JWT.
