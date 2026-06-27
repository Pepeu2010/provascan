# ProvaScan

Sistema web para professores corrigirem provas objetivas, manterem turmas e alunos organizados, salvarem gabaritos e registrarem correções com histórico local pronto para uso imediato.

## Estado atual

O projeto já está utilizável para operação inicial e deploy no Vercel sem backend obrigatório.

Funciona hoje:

- Landing page e login
- Tema claro, escuro e sistema
- Dashboard com métricas derivadas dos dados salvos
- Cadastro de turmas
- Cadastro de alunos
- Cadastro de provas
- Editor de gabarito com salvamento
- Fluxo de correção com revisão manual
- Histórico persistido no navegador
- Backup e restauração em JSON

Limitações atuais:

- Persistência padrão via `localStorage`
- Google Sheets e OCR continuam opcionais
- Ainda não há autenticação real por professor

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

Abra `http://localhost:3000`.

## Variáveis de ambiente

Essas variáveis são opcionais. Sem elas, o app opera em modo local com persistência no navegador.

```bash
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=
GOOGLE_SHEETS_SPREADSHEET_ID=
ENABLE_TESSERACT_OCR=
```

## Deploy no Vercel

Para a primeira publicação:

1. Suba este repositório para o GitHub.
2. Importe o projeto no Vercel.
3. Se não for usar Google Sheets/OCR agora, publique sem variáveis extras.
4. Se quiser integração depois, adicione as variáveis no painel do Vercel e faça novo deploy.

## Estrutura

- `app/`: rotas e páginas
- `components/`: shell, UI e áreas operacionais
- `lib/`: store local, utilitários e dados base
- `services/`: integrações opcionais
- `types/`: contratos de domínio

## Publicação no GitHub

O `gh` não está instalado nesta máquina, então a criação automática do repositório não pôde ser feita por aqui.

Fluxo recomendado:

```bash
git add .
git commit -m "feat: prepare provascan operational mvp"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/provascan.git
git push -u origin main
```

Se preferir, também posso te deixar no próximo passo com o repositório local já inicializado e os comandos finais prontos para copiar no GitHub.
