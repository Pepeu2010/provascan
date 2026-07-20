# ProvaScan

Sistema web para professores corrigirem provas objetivas, organizarem turmas e alunos, salvarem gabaritos e registrarem correcoes com persistencia operacional em Google Planilhas. A autenticacao usa Google Sheets como base inicial de usuarios.

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
- Fluxo de correcao com revisao manual e historico persistido em planilha
- UX mobile especifica para gabarito e correcao
- Exportacao operacional em JSON e CSV
- Importacao e restauracao por JSON

Limitacoes atuais:

- Google Planilhas continua sendo a camada de persistencia, entao concorrencia pesada nao e o foco
- O painel administrativo de usuarios ainda nao foi implementado por completo
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
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SHEETS_USERS_TAB=usuarios
GOOGLE_SHEETS_STUDENTS_TAB=alunos
GOOGLE_SHEETS_CLASSES_TAB=turmas
GOOGLE_SHEETS_EXAMS_TAB=provas
GOOGLE_SHEETS_ANSWER_KEYS_TAB=gabaritos
GOOGLE_SHEETS_CORRECTION_RULES_TAB=regras_correcao
GOOGLE_SHEETS_CORRECTIONS_TAB=correcoes
GOOGLE_SHEETS_CONFIG_TAB=provascan_config
GOOGLE_SHEETS_META_TAB=provascan_meta
ENABLE_TESSERACT_OCR=
AUTH_SECRET=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

Regras:

- `GOOGLE_SHEETS_PRIVATE_KEY` deve manter `\n` escapado no `.env`
- `AUTH_SECRET` deve ter pelo menos 32 caracteres
- nunca versionar `.env` nem expor email de servico, chave privada ou credenciais no frontend

## Estrutura da aba `usuarios`

O sistema depende exatamente destas colunas existentes:

```txt
id | nome | email | senha | perfil | disciplina | ativo | trocar_senha
```

Regras aplicadas:

- login pelo campo `email`
- comparacao da senha digitada com a coluna `senha`
- acesso permitido apenas quando `ativo = SIM`
- o campo `perfil` define a permissao do usuario
- o campo `disciplina` define a materia operacional do usuario
- o campo `trocar_senha` obriga o redirecionamento para `/trocar-senha`
- toda leitura da planilha acontece apenas no backend

Regra importante de escopo:

- `admin` pode ver todas as materias e nao depende de `disciplina`
- `vice_diretor` pode ver todas as materias e nao depende de `disciplina`
- `professor` precisa ter `disciplina` preenchida na aba `usuarios`
- se a `disciplina` estiver vazia para um `professor`, o painel bloqueia a carga com erro de configuracao

Materias padronizadas hoje:

- `Artes`
- `Biologia`
- `Ciencias`
- `Educacao Fisica`
- `Filosofia`
- `Fisica`
- `Geografia`
- `Historia`
- `Ingles`
- `Lingua Portuguesa`
- `Matematica`
- `Quimica`
- `Redacao`
- `Sociologia`

Aliases aceitos e normalizados automaticamente:

- `Portugues` vira `Lingua Portuguesa`
- `Lingua Inglesa` vira `Ingles`
- `Ed Fisica` vira `Educacao Fisica`
- `Mat` vira `Matematica`

## Compatibilidade atual e futura da senha

Hoje o sistema endurece a coluna `senha` sem alterar o schema da planilha. Se um usuario ainda estiver com senha em texto simples, o sistema converte esse valor para bcrypt no primeiro login valido ou na troca obrigatoria de senha.

Isso preserva a estrutura atual sem manter o fallback inseguro em operacao normal.

## Rotas de autenticacao

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/password`
- `GET /api/app-data`
- `PUT /api/app-data`

As areas `/dashboard`, `/admin` e `/painel` exigem autenticacao. Quando `trocar_senha = SIM`, o usuario so pode seguir para `/trocar-senha` ate concluir a atualizacao. Rotas privilegiadas tambem respeitam o `perfil` da planilha.

## Deploy no Vercel

1. Suba este repositorio para o GitHub.
2. Importe o projeto no Vercel.
3. Configure as variaveis de ambiente do login antes do deploy.
4. Compartilhe a planilha com o email da service account como editor.
5. Se quiser OCR depois, adicione a variavel correspondente e faca novo deploy.

## Estrutura

- `app/`: rotas e paginas
- `components/`: shell, UI e areas operacionais
- `lib/`: estado base, utilitarios e autenticacao
- `services/`: integracoes opcionais e acesso ao Google Sheets
- `types/`: contratos de dominio

## Checklist antes de subir

- Verifique se `.env*` continua fora do commit
- Rode `npm run lint`
- Rode `npm run build`
- Teste `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` e `POST /api/auth/password`
- Teste `GET /api/app-data` e `PUT /api/app-data`
- Confirme que a aba `usuarios` tem exatamente as colunas esperadas
- Confirme que as abas operacionais (`turmas`, `alunos`, `provas`, `gabaritos`, `regras_correcao`, `correcoes`, `provascan_config`) foram criadas ou inicializadas
- Abra o app e teste login normal, login inativo e fluxo de troca obrigatoria
