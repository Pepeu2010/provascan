# ProvaScan

Sistema web para professores corrigirem provas objetivas, organizarem turmas e alunos, salvarem gabaritos e registrarem correcoes com historico local. A autenticacao usa Google Sheets como base inicial de usuarios.

## Estado atual

Funciona hoje:

- Landing page, tela de login e sessao segura por cookie httpOnly
- Autenticacao manual baseada na aba `usuarios` do Google Sheets
- Forca troca de senha quando `trocar_senha = SIM`
- Tema claro, escuro e sistema
- Dashboard com metricas derivadas do estado salvo
- Cadastro, edicao e exclusao de turmas
- Cadastro, edicao e exclusao de alunos
- Cadastro, edicao e exclusao de provas
- Editor de gabarito com salvamento real
- Fluxo de correcao com revisao manual e historico local
- UX mobile especifica para gabarito e correcao
- Exportacao operacional em JSON e CSV
- Importacao e restauracao por JSON

Limitacoes atuais:

- Persistencia funcional principal ainda segue em `localStorage`
- O painel administrativo de usuarios ainda nao foi implementado
- OCR continua opcional

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS 4
- Lucide React
- Zod
- Google Sheets API
- bcryptjs
- jose
- Tesseract.js opcional

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Variaveis de ambiente

Para o login funcionar de verdade, estas variaveis precisam existir.

```bash
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=1T9KxrlZxyQGr-721Q93AZ9PO1gaIxq4mHg6vK--5aOo
GOOGLE_SHEETS_USERS_TAB=usuarios
ENABLE_TESSERACT_OCR=
AUTH_SECRET=
```

Regras:

- `GOOGLE_SHEETS_PRIVATE_KEY` deve manter `\n` escapado no `.env`
- `AUTH_SECRET` deve ter pelo menos 32 caracteres
- nunca versionar `.env` nem expor email de servico, chave privada ou credenciais no frontend

## Estrutura da aba `usuarios`

O sistema depende exatamente destas colunas existentes:

```txt
id | nome | email | senha | perfil | ativo | trocar_senha
```

Regras aplicadas:

- login pelo campo `email`
- comparacao da senha digitada com a coluna `senha`
- acesso permitido apenas quando `ativo = SIM`
- o campo `perfil` define a permissao do usuario
- o campo `trocar_senha` obriga o redirecionamento para `/trocar-senha`
- toda leitura da planilha acontece apenas no backend

## Compatibilidade atual e futura da senha

Hoje o sistema aceita a planilha do jeito que ela esta. Se o valor da coluna `senha` estiver em texto simples, ele compara em texto simples. Se estiver em bcrypt, ele compara como hash.

Isso preserva a estrutura atual e prepara o caminho para endurecer seguranca depois, sem quebrar a planilha.

## Rotas de autenticacao

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/password`

As areas `/dashboard`, `/admin` e `/painel` exigem autenticacao. Quando `trocar_senha = SIM`, o usuario so pode seguir para `/trocar-senha` ate concluir a atualizacao.

## Deploy no Vercel

1. Suba este repositorio para o GitHub.
2. Importe o projeto no Vercel.
3. Configure as variaveis de ambiente do login antes do deploy.
4. Compartilhe a planilha com o email da service account como editor.
5. Se quiser OCR depois, adicione a variavel correspondente e faca novo deploy.

## Estrutura

- `app/`: rotas e paginas
- `components/`: shell, UI e areas operacionais
- `lib/`: store local, utilitarios e autenticacao
- `services/`: integracoes opcionais e acesso ao Google Sheets
- `types/`: contratos de dominio

## Checklist antes de subir

- Verifique se `.env*` continua fora do commit
- Rode `npm run lint`
- Rode `npm run build`
- Teste `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` e `POST /api/auth/password`
- Confirme que a aba `usuarios` tem exatamente as colunas esperadas
- Abra o app e teste login normal, login inativo e fluxo de troca obrigatoria
