# ProvaScan

Sistema web para professores corrigirem provas objetivas, organizarem turmas e alunos, salvarem gabaritos e registrarem correções. O Supabase é a fonte de verdade operacional e de autenticação; Google Sheets não faz parte do runtime atual.

## Stack

- Next.js 16 e TypeScript
- Tailwind CSS 4
- Supabase (Postgres e RPC server-side)
- Zod, bcryptjs, jose e TOTP
- Tesseract.js opcional

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=
MFA_ENCRYPTION_KEY=
MFA_REQUIRED=true
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ENABLE_TESSERACT_OCR=
```

- `SUPABASE_SERVICE_ROLE_KEY` e `AUTH_SECRET` são segredos de servidor: nunca use `NEXT_PUBLIC_`.
- `AUTH_SECRET` deve ter pelo menos 32 caracteres.
- `MFA_ENCRYPTION_KEY` deve ser uma chave aleatória de 32 bytes em Base64.
- Em produção, configure as variáveis no Vercel como **Sensitive** e faça um novo deploy após alterá-las.

## Banco de dados

Antes de rodar ou publicar, aplique as migrations em `supabase/migrations/` no projeto Supabase. Elas criam as tabelas operacionais (`classes`, `students`, `exams`, `answer_keys`, `correction_rules`, `corrections`), os perfis em `app_users`, tabelas internas de segurança e a RPC atômica `replace_operational_state`.

O backend acessa o Supabase exclusivamente pelo servidor. A chave de serviço não é enviada ao navegador.

## Acesso e escopo

- Todos os perfis autenticados trabalham sobre a mesma base de provas; não há escopo por disciplina.
- Usuários legados com senha em texto simples são convertidos para bcrypt no primeiro login válido ou na troca obrigatória de senha.
- O MFA usa TOTP e desafios persistidos; em produção, Redis é necessário para que o fluxo funcione entre execuções serverless.

## Rotas principais

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/password`
- `GET /api/app-data`
- `PUT /api/app-data`

## Checklist de deploy

1. Aplique todas as migrations no Supabase.
2. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` e `MFA_ENCRYPTION_KEY` no Vercel.
3. Configure Redis e `MFA_REQUIRED=true` para produção.
4. Execute `npm run lint` e `npm run build`.
5. Teste login, carga de `/api/app-data` e a criação de uma prova.
