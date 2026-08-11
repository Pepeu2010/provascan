# Cloudflare: configuração recomendada

Cloudflare é uma camada de borda. Ele não substitui RLS, validação de sessão ou
autorização de recursos no servidor.

## Configuração segura

1. Adicione o domínio próprio à Cloudflare e mantenha SSL/TLS em **Full
   (strict)**. O origin continua sendo a Vercel.
2. Ative proxy apenas para o domínio público; não exponha endpoints Supabase ou
   o painel de administração como origins alternativos.
3. Crie regras de rate limit para `POST /api/auth/login`,
   `POST /api/auth/password` e `POST /api/scan`. Elas são uma segunda camada;
   os limites do servidor continuam obrigatórios.
4. Ative Managed Challenge/Bot Fight Mode de forma monitorada. Exclua apenas
   verificações de saúde necessárias, nunca `/api/*` inteiro.
5. Adicione Turnstile ao login somente junto da validação do token no Route
   Handler. O widget sozinho não protege o endpoint.
6. Não faça cache de `/api/*`, dashboard, resultados, respostas ou qualquer
   conteúdo autenticado.

## Antes de apontar o DNS

Teste login, MFA, logout, páginas protegidas e uploads futuros em um domínio de
preview. Uma regra de challenge agressiva pode bloquear usuários legítimos; use
eventos e logs para ajustar, não suposições.
