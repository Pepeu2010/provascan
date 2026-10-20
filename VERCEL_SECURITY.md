# Segurança na Vercel

## Controles presentes

- CSP restritiva, anti-clickjacking, `nosniff`, política de referrer e
  permissions policy definidos em `next.config.ts`.
- Isolamento de contexto/origem e desativação de DNS prefetch.
- Todas as respostas de `/api/*` recebem `Cache-Control: no-store, max-age=0`.
- Cookies de sessão e pré-autenticação são HTTP-only, `Secure` em produção,
  `SameSite=Lax` e têm expiração limitada.
- Mutação de dados valida origem, sessão, papel e schema no servidor.
- Login, senha, MFA, OCR e mutações administrativas/colaborativas usam rate
  limit por IP e identidade, com Redis Upstash em produção e fallback local
  em memória para desenvolvimento.

## Variáveis de ambiente obrigatórias

- `AUTH_SECRET` (mínimo de 32 caracteres aleatórios)
- `MFA_ENCRYPTION_KEY` (chave AES válida)
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` para gravações
- `GOOGLE_DRIVE_FOLDER_ID` para importação e download de arquivos originais

Marque as chaves secretas como Production/Preview conforme a necessidade.
Nunca use `NEXT_PUBLIC_` para elas. Rotacione qualquer segredo exibido em log,
commit, captura de tela ou ferramenta de terceiros.

## Operação

A Vercel já força HTTPS e aplica HSTS na plataforma. Não foi possível ler os
logs de runtime pelo conector atual, pois ele não tem acesso ao project id
configurado no repositório. Reconecte a integração da Vercel e revise erros,
logs e variáveis no painel antes de considerar a auditoria operacional fechada.
