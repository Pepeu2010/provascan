# ProvaScan

Sistema web para professores corrigirem provas objetivas, organizarem turmas e alunos, salvarem gabaritos e registrarem correcoes com historico local pronto para uso imediato.

## Estado atual

O projeto ja esta utilizavel como MVP operacional e pode ser publicado no Vercel sem backend obrigatorio.

Funciona hoje:

- Landing page e login local
- Sessao minima por professor no navegador
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
- Painel local de integracao para continuidade futura com Google Sheets

Limitacoes atuais:

- Persistencia padrao via `localStorage`
- Google Sheets e OCR continuam opcionais
- Ainda nao ha autenticacao institucional real

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS 4
- Lucide React
- Zod
- Google Sheets API opcional
- Tesseract.js opcional

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Variaveis de ambiente

Essas variaveis sao opcionais. Sem elas, o app opera em modo local com persistencia no navegador.

```bash
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
ENABLE_TESSERACT_OCR=
```

## Deploy no Vercel

1. Suba este repositorio para o GitHub.
2. Importe o projeto no Vercel.
3. Se nao for usar Google Sheets ou OCR agora, publique sem variaveis extras.
4. Se quiser integracao depois, adicione as variaveis no painel do Vercel e faca novo deploy.

## Estrutura

- `app/`: rotas e paginas
- `components/`: shell, UI e areas operacionais
- `lib/`: store local, utilitarios e dados base
- `services/`: integracoes opcionais
- `types/`: contratos de dominio

## Publicacao no GitHub

O `gh` nao esta instalado nesta maquina, entao a criacao automatica do repositorio nao foi feita por aqui.

Fluxo recomendado:

```bash
git init
git add .
git commit -m "feat: finalize provascan local-first mvp"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/provascan.git
git push -u origin main
```

## Checklist antes de subir

- Verifique se `.env*` continua fora do commit
- Rode `npm run lint`
- Rode `npm run build`
- Abra o app e teste login, cadastros, gabarito, correcao e exportacao
