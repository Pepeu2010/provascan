# Auditoria anti-vibecoding — 2026-08-10

## Método e limites

Foram revisados Route Handlers, proxy, sessão, uso de service role, migrations,
payload schemas, sinks HTML, variáveis de ambiente e bundle de produção. A
verificação do Supabase foi feita por consultas de catálogo e privilégios; não
foram criadas contas/dados de teste no projeto de produção.

## Resultado dos achados

| ID | Situação | Severidade | Evidência e resultado |
| --- | --- | --- | --- |
| AUTH-01 | Corrigido | Alta | `/api/dashboard` validava apenas sessão e podia devolver dados operacionais a professor autenticado. Agora exige `canAccessOperationalData`; regressão em `test:api-authorization`. |
| MFA-01 | Corrigido | Média | Challenge TOTP não era consumido após uso. Agora é invalidado antes de gravar o MFA; regressão em `test:security-hardening`. |
| SECRET-01 | Ação operacional | Média | Scanner encontrou chave privada Google local e tokens OIDC locais em arquivos ignorados. Eles não estão rastreados nem usados pelo código atual. Remova/rotacione a chave Google se a integração legada não for necessária; não há mudança segura a fazer no repositório. |

## RLS e privilégios diretos

Todas as tabelas acessíveis à aplicação no schema `public` possuem RLS. A
consulta de catálogo confirmou policy `USING false`/`WITH CHECK false` e
`has_table_privilege` retornou `false` para SELECT, INSERT, UPDATE e DELETE de
`anon` e `authenticated` em todas elas.

| Tabela | RLS | SELECT | INSERT | UPDATE | DELETE | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| answer_keys, classes, students, exams | Sim | Negado | Negado | Negado | Negado | PASS |
| correction_rules, corrections, grades | Sim | Negado | Negado | Negado | Negado | PASS |
| app_users, app_settings_internal, operational_meta_internal | Sim | Negado | Negado | Negado | Negado | PASS |
| audit_log_internal, request_rate_limits_internal | Sim | Negado | Negado | Negado | Negado | PASS |
| exam_sections | Sim | Negado | Negado | Negado | Negado | PASS |
| psychologist_referrals, student_reports, teacher_student_links, tutoring_sessions | Sim | Negado | Negado | Negado | Negado | PASS |

Não existe policy permissiva (`USING true` ou `WITH CHECK true`) nessas tabelas.
A service role ignora RLS, mas é criada somente por módulos `server-only`; não
há cliente Supabase no navegador.

## Matriz de autorização do servidor

| Recurso | Professor | Coordenador | Vice-diretor | Admin |
| --- | --- | --- | --- | --- |
| Seção própria de prova colaborativa | Sim | Não | Não | Não |
| Seção de outro professor | Não | Revisão apenas | Revisão apenas | Revisão apenas |
| Criar/revisar/liberar prova colaborativa | Não | Sim | Sim | Sim |
| Dados operacionais e dashboard | Não | Sim | Sim | Sim |
| Roster completo e usuários | Não | Não | Sim | Sim |

IDs enviados pelo cliente não bastam: a seção do professor é consultada com
`exam_id`, `section_id` e `teacher_id` da sessão. As rotas administrativas
recalculam papel a partir do cookie assinado e do registro atual do usuário.

## Demais testes

| Controle | Estado | Evidência |
| --- | --- | --- |
| Mass assignment | PASS com ressalva | Payloads de rotas são Zod allowlists/`strict`; `app-data` é substituição administrativa completa e deve continuar restrita à gestão. |
| Secrets no repositório/bundle | PASS | Arquivos de ambiente e `.vercel` estão ignorados; scan dos arquivos rastreados não encontrou padrões de chave privada/service role; bundle `.next/static` não contém nomes de segredos nem material de chave. |
| XSS | PASS | Nenhum `dangerouslySetInnerHTML`, `eval` ou `document.write`; a geração de impressão usa `textContent` para escapar cada campo interpolado. |
| CSRF | PASS | Mutações exigem `Origin` igual ao host, além de cookies HTTP-only `SameSite=Lax`; CORS não é usado como substituto. |
| SSRF | N/A | Não há fetch de URL controlada pelo usuário, proxy de URL ou webhook de entrada. |
| Storage/upload | N/A atualmente | Projeto não possui bucket nem objetos; OCR atual processa a imagem localmente e não recebe upload no servidor. |
| Dependências produção | PASS | `npm audit --omit=dev` retornou 0 vulnerabilidades. |

## Ferramentas e verificações

- Trivy (secrets/misconfiguration, excluindo dependências/artefatos): detectou
  somente segredos esperados em arquivos locais ignorados.
- Semgrep está instalado, mas não havia ruleset offline aplicável; `--config
  auto` exigiria download e não foi executado.
- Gitleaks e OWASP ZAP não estão instalados. ZAP não foi substituído por scan
  agressivo contra produção.
- Build, lint, TypeScript e regressões de MFA, autorização e colaboração devem
  passar antes de publicar a correção.

## Pendências externas

1. Rotacionar/remover a credencial Google Sheets local não utilizada, se ela
   ainda for válida.
2. Reconectar o conector Vercel para revisar logs e erros de runtime.
3. Antes de ativar upload real, implementar o fluxo privado descrito em
   `OCR_SECURITY.md` e testes de arquivo malicioso/ownership.
