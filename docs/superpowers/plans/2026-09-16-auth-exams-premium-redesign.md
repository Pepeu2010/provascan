# Premium Login, MFA and Exams Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Login, MFA, the exam library, and the complete exam-authoring journey to match the visual quality of the Answer Key Center without changing information, APIs, permissions, or behavior.

**Architecture:** Keep the existing React state machines and server contracts intact, and change only presentational markup, class names, dedicated component stylesheets, and accessible state presentation. Protect unchanged behavior with source-backed regression checks, then verify the real flows in the browser at desktop, tablet, and mobile widths.

**Tech Stack:** Next.js 16.3.5 App Router, React 19, TypeScript, CSS, Tailwind utility classes already present in the project, Lucide icons, Framer Motion, existing ProvaScan UI primitives.

**Spec:** `docs/superpowers/specs/2026-09-16-auth-exams-premium-redesign.md`

## Global Constraints

- Preserve all existing information, functional copy, server messages, API paths, payloads, authentication requirements, roles, and permissions.
- Do not change database schemas, RLS, MFA policy, session duration, exam formats, OCR behavior, printing behavior, or publication rules.
- Keep `OtpInput` as one native input with six visual cells so paste, autofill, and accessibility remain functional.
- Use dedicated stylesheets imported by their owning components so Vercel emits route-relevant CSS chunks.
- Support 1440 px, 1024 px, 768 px, 390 px, and 360 px without horizontal overflow or obscured actions.
- Preserve unrelated work and publish only this branch through a reviewed pull request.

---

### Task 1: Add the visual-contract regression harness

**Files:**
- Create: `scripts/verify-premium-auth-exams-ui.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: source files as UTF-8 strings through Node `readFileSync`.
- Produces: `npm run test:premium-auth-exams-ui`, a deterministic structural regression command.

- [ ] **Step 1: Write the failing Login visual-contract assertions**

Create the script with direct assertions for the dedicated stylesheet, named visual regions, unchanged login labels, and native autocomplete behavior:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const login = read("components/login-form.tsx");

assert.match(login, /import "\.\/login-form\.css"/);
assert.match(login, /login-page__story/);
assert.match(login, /login-page__access/);
assert.match(login, /Nome de acesso/);
assert.match(login, /Lembrar este dispositivo por 30 dias/);
assert.match(login, /autoComplete="username"/);
assert.match(login, /autoComplete="current-password"/);
```

Add the package script:

```json
"test:premium-auth-exams-ui": "npx --no-install tsx scripts/verify-premium-auth-exams-ui.ts"
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm run test:premium-auth-exams-ui`

Expected: FAIL because `login-form.tsx` does not import `login-form.css` and does not yet expose the new presentation regions.

- [ ] **Step 3: Commit the failing contract**

```bash
git add package.json scripts/verify-premium-auth-exams-ui.ts
git commit -m "test: define premium auth and exams visual contract"
```

### Task 2: Redesign Login without changing authentication behavior

**Files:**
- Create: `components/login-form.css`
- Modify: `components/login-form.tsx`
- Modify: `app/globals.css`
- Test: `scripts/verify-premium-auth-exams-ui.ts`

**Interfaces:**
- Consumes: `useAppData().loginTeacher`, `session`, `authResolved`, `getSafePostAuthRedirect`, and `AuthSecurityFlow` unchanged.
- Produces: the same `LoginForm()` component and form submission behavior with new `.login-page__story` and `.login-page__access` presentation regions.

- [ ] **Step 1: Preserve a copy-and-contract snapshot before changing markup**

Extend the test with the existing submission and transition anchors:

```ts
assert.match(login, /loginTeacher\(\{ email, password, remember \}\)/);
assert.match(login, /setSecurityFlow\(true\)/);
assert.match(login, /<AuthSecurityFlow onComplete=/);
assert.match(login, /type="submit"/);
```

- [ ] **Step 2: Run the test and confirm it still fails only on new visual selectors**

Run: `npm run test:premium-auth-exams-ui`

Expected: FAIL on the missing stylesheet or region assertion; unchanged behavior assertions pass.

- [ ] **Step 3: Implement the Login presentation**

Import `./login-form.css`, retain every current text string and handler, and organize the existing content into these regions:

```diff
- <div className="login-page__frame mx-auto grid min-h-[calc(100dvh-32px)] max-w-[1160px] items-center py-6 lg:grid-cols-[1.08fr_.92fr] lg:py-10">
-   <section className="login-page__instrument" aria-label="Como o ProvaScan trabalha">
+ <div className="login-page__shell">
+   <section className="login-page__story" aria-label="Como o ProvaScan trabalha">
  
-   <div className="login-page__form w-full max-w-[480px] justify-self-center lg:justify-self-end">
+   <section className="login-page__access" aria-label="Acesso ao ProvaScan">
  
-   </div>
+   </section>
```

In `login-form.css`, define the asymmetric desktop composition, focus-visible states, stable button loading dimensions, actionable error/success surfaces, a compact tablet story band, and a single-column mobile layout. Move only Login-specific selectors out of `app/globals.css`; leave shared tokens and keyframes there.

- [ ] **Step 4: Run Login contract and existing auth regression tests**

Run:

```bash
npm run test:premium-auth-exams-ui
npm run test:auth-flow
npm run test:security-hardening
```

Expected: PASS for all commands.

- [ ] **Step 5: Commit the Login redesign**

```bash
git add app/globals.css components/login-form.tsx components/login-form.css scripts/verify-premium-auth-exams-ui.ts
git commit -m "feat: redesign login presentation"
```

### Task 3: Redesign every MFA and account-security state

**Files:**
- Create: `components/auth-security-flow.css`
- Modify: `components/auth-security-flow.tsx`
- Test: `scripts/verify-premium-auth-exams-ui.ts`

**Interfaces:**
- Consumes: existing `/api/auth/flow`, `/api/auth/password`, `/api/auth/mfa/method`, `/api/auth/mfa/totp`, and `/api/auth/mfa/recovery` contracts unchanged.
- Produces: the same `AuthSecurityFlow({ onComplete })` behavior with `.security-flow`, `.security-flow__stage`, `.security-flow__qr`, `.security-flow__recovery`, and `.security-flow__status` presentation regions.

- [ ] **Step 1: Add failing MFA visual and behavior-preservation assertions**

```ts
const security = read("components/auth-security-flow.tsx");
assert.match(security, /import "\.\/auth-security-flow\.css"/);
assert.match(security, /security-flow__stage/);
assert.match(security, /security-flow__qr/);
assert.match(security, /security-flow__recovery/);
assert.match(security, /className="absolute inset-0 cursor-text opacity-0"/);
assert.equal((security.match(/<input/g) ?? []).length >= 2, true);
for (const endpoint of ["/api/auth/flow", "/api/auth/password", "/api/auth/mfa/method", "/api/auth/mfa/totp", "/api/auth/mfa/recovery"]) assert.match(security, new RegExp(endpoint));
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm run test:premium-auth-exams-ui`

Expected: FAIL on the missing MFA stylesheet and presentation regions.

- [ ] **Step 3: Implement the MFA presentation**

Import the dedicated stylesheet and give the shared header an exact presentation contract:

```tsx
const stageClassName = "security-flow security-flow__stage";

function StepHeader({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <header className="security-flow__header"><div className="security-flow__eyebrow">{icon}<span>SEGURANÇA DA CONTA</span></div><h2>{title}</h2><p>{text}</p></header>;
}
```

Keep the current step switch, requests, strings, QR generation, recovery code actions, checkboxes, and OTP input logic unchanged. Style the QR as a high-contrast scan surface, recovery codes as a legible grid, errors as stable alert panels, and the six visual OTP cells with clear focus/filled states. Add mobile rules at 640 px and reduced-motion rules.

- [ ] **Step 4: Verify MFA and authentication behavior**

Run:

```bash
npm run test:premium-auth-exams-ui
npm run test:auth-flow
npm run test:security-hardening
npx eslint components/login-form.tsx components/auth-security-flow.tsx scripts/verify-premium-auth-exams-ui.ts
```

Expected: PASS with no new lint errors.

- [ ] **Step 5: Commit the MFA redesign**

```bash
git add components/auth-security-flow.tsx components/auth-security-flow.css scripts/verify-premium-auth-exams-ui.ts
git commit -m "feat: redesign account security flow"
```

### Task 4: Turn the exam library into a premium operational workspace

**Files:**
- Create: `components/teacher-exams-workspace.css`
- Modify: `components/teacher-exams-workspace.tsx`
- Modify: `app/globals.css`
- Test: `scripts/verify-premium-auth-exams-ui.ts`

**Interfaces:**
- Consumes: existing `TeacherExam[]`, `readOnly`, query/status/origin/subject state, `openEditor`, `openPrint`, and `action` handlers unchanged.
- Produces: the same `TeacherExamsWorkspace({ libraryOnly })` public interface with premium list, filter, skeleton, empty, message, and read-only states.

- [ ] **Step 1: Add failing exam-library visual assertions**

```ts
const exams = read("components/teacher-exams-workspace.tsx");
assert.match(exams, /import "\.\/teacher-exams-workspace\.css"/);
assert.match(exams, /teacher-exams__command/);
assert.match(exams, /teacher-exams__filters/);
assert.match(exams, /exam-card__primary/);
assert.match(exams, /ExamListSkeleton/);
assert.match(exams, /Nenhuma prova corresponde aos filtros/);
assert.match(exams, /Sua primeira prova começa aqui/);
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `npm run test:premium-auth-exams-ui`

Expected: FAIL on the missing dedicated stylesheet and new library selectors.

- [ ] **Step 3: Implement the exam-library presentation**

Keep all filtering and action code intact. Recompose the current library markup into:

```diff
- <section className="teacher-exams__hero">
+ <section className="teacher-exams__command">
  
- <section className="teacher-exams__stats" aria-label="Resumo das provas">
+ <nav className="teacher-exams__stats" aria-label="Resumo das provas">
  
- <Card className="teacher-exams__toolbar">
+ <Card className="teacher-exams__filters">
  
- <div className="teacher-exams__list">
+ <section className="teacher-exams__grid" aria-label="Provas encontradas">
```

Change only the presentational output of `ExamRow` into an exam card while preserving every displayed field and existing action callback. The primary action receives `.exam-card__primary`; print/card and overflow actions retain their original handlers and labels. Move exam-specific CSS from `app/globals.css` into `teacher-exams-workspace.css` and add responsive one-column behavior.

- [ ] **Step 4: Verify exam list, authorization, and printing regressions**

Run:

```bash
npm run test:premium-auth-exams-ui
npm run test:teacher-exam-flow
npm run test:exam-printing
npm run test:api-authorization
npm run test:dashboard-responsive-card
```

Expected: PASS for all commands.

- [ ] **Step 5: Commit the exam-library redesign**

```bash
git add app/globals.css components/teacher-exams-workspace.tsx components/teacher-exams-workspace.css scripts/verify-premium-auth-exams-ui.ts
git commit -m "feat: redesign exam library workspace"
```

### Task 5: Redesign manual/import entry and file-processing feedback

**Files:**
- Modify: `components/teacher-exams-workspace.tsx`
- Modify: `components/teacher-exams-workspace.css`
- Test: `scripts/verify-premium-auth-exams-ui.ts`

**Interfaces:**
- Consumes: `CreationChoice`, `fileInput`, `importFile`, `startManual`, `busy`, and the existing accepted file types.
- Produces: unchanged manual/import behavior with `.creation-hub`, `.creation-hub__option`, and `.creation-hub__busy` presentation states.

- [ ] **Step 1: Add failing creation-entry assertions**

```ts
assert.match(exams, /creation-hub/);
assert.match(exams, /creation-hub__option/);
assert.match(exams, /accept="\.pdf,\.doc,\.docx,\.jpg,\.jpeg,\.png"/);
assert.match(exams, /if \(file\) void onImport\(file\)/);
assert.match(exams, /onManual/);
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `npm run test:premium-auth-exams-ui`

Expected: FAIL because `.creation-hub` presentation does not exist.

- [ ] **Step 3: Implement the creation-entry presentation**

Recompose `CreationChoice` into a clear two-option hub, retaining the same labels, accepted file types, hidden file input, callbacks, and busy state. Use only CSS for hover/focus elevation and disable motion under `prefers-reduced-motion`.

- [ ] **Step 4: Verify creation and import contracts**

Run:

```bash
npm run test:premium-auth-exams-ui
npm run test:teacher-exam-flow
npm run test:select-experience
```

Expected: PASS.

- [ ] **Step 5: Commit the creation-entry redesign**

```bash
git add components/teacher-exams-workspace.tsx components/teacher-exams-workspace.css scripts/verify-premium-auth-exams-ui.ts
git commit -m "feat: redesign exam creation entry"
```

### Task 6: Redesign the complete four-step exam editor

**Files:**
- Modify: `components/teacher-exams-workspace.tsx`
- Modify: `components/teacher-exams-workspace.css`
- Test: `scripts/verify-premium-auth-exams-ui.ts`

**Interfaces:**
- Consumes: existing `ExamEditor`, `BasicInformation`, `QuestionEditor`, `AnswerKeyEditor`, `ExamReview`, `save`, autosave, drag/reorder, and validation behavior unchanged.
- Produces: the same four editor steps and callbacks with `.exam-studio`, `.exam-studio__rail`, `.exam-studio__canvas`, `.question-block`, and `.publish-checklist` presentation regions.

- [ ] **Step 1: Add failing editor visual and behavior-preservation assertions**

```ts
for (const label of ["Informações", "Questões", "Gabarito", "Revisão"]) assert.match(exams, new RegExp(label));
assert.match(exams, /exam-studio__rail/);
assert.match(exams, /exam-studio__canvas/);
assert.match(exams, /question-block/);
assert.match(exams, /publish-checklist/);
assert.match(exams, /validateExamForPublication\(draft\)/);
assert.match(exams, /window\.localStorage\.setItem\(LOCAL_DRAFT_KEY/);
assert.match(exams, /onSave\("rascunho"\)/);
assert.match(exams, /onSave\("publicar"\)/);
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `npm run test:premium-auth-exams-ui`

Expected: FAIL on the new editor regions while all behavior-preservation assertions pass.

- [ ] **Step 3: Implement the editor shell and step navigation**

Retain the current four-step state and callbacks. Recompose only the markup hierarchy:

```diff
- <div className="exam-editor mx-auto grid max-w-[1420px] gap-5">
-   <header className="exam-editor__top">
+ <div className="exam-studio mx-auto grid max-w-[1420px] gap-5">
+   <header className="exam-studio__header">
  
-   <nav className="exam-editor__steps" aria-label="Etapas da criação">
+   <nav className="exam-studio__steps" aria-label="Etapas da criação">
  
-   <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"><Card className="exam-editor__main">
+   <div className="exam-studio__layout"><Card className="exam-studio__canvas">
  
-   </Card><aside className="exam-editor__aside">
+   </Card><aside className="exam-studio__rail">
  
-   <footer className="exam-editor__actions">
+   <footer className="exam-studio__actions">
```

The mobile layout collapses the rail into normal flow and adds bottom padding equal to the action bar height.

- [ ] **Step 4: Redesign question, answer-key, and review presentation**

Add `.question-block` wrappers without changing field names, input values, reorder, duplicate, delete, weight, alternatives, criteria, or annulling behavior. Add `.publish-checklist` to the existing review summary and validation errors, keeping the exact information and navigation behavior. Style objective, subjective, annulled, pending, and ready states with existing data only.

- [ ] **Step 5: Verify the full editor contract**

Run:

```bash
npm run test:premium-auth-exams-ui
npm run test:teacher-exam-flow
npm run test:exam-printing
npm run test:select-experience
npx eslint components/teacher-exams-workspace.tsx scripts/verify-premium-auth-exams-ui.ts
```

Expected: PASS with no new lint errors.

- [ ] **Step 6: Commit the complete editor redesign**

```bash
git add components/teacher-exams-workspace.tsx components/teacher-exams-workspace.css scripts/verify-premium-auth-exams-ui.ts
git commit -m "feat: redesign complete exam editor"
```

### Task 7: Integrated verification, responsive QA, and production delivery

**Files:**
- Modify only if verification finds a reproducible defect in the files already listed.

**Interfaces:**
- Consumes: all deliverables from Tasks 1–6.
- Produces: verified branch, pull request, merged production deployment, and browser evidence.

- [ ] **Step 1: Run the fresh automated verification suite**

```bash
npm run test:premium-auth-exams-ui
npm run test:auth-flow
npm run test:security-hardening
npm run test:teacher-exam-flow
npm run test:exam-printing
npm run test:api-authorization
npm run test:dashboard-responsive-card
npm run test:select-experience
npm run test:answer-keys-workspace
npx eslint components/login-form.tsx components/auth-security-flow.tsx components/teacher-exams-workspace.tsx scripts/verify-premium-auth-exams-ui.ts
npm run build
git diff --check
```

Expected: every command exits 0. Existing warnings must be identified separately; no new warnings are accepted.

- [ ] **Step 2: Verify emitted CSS chunks**

Run:

```bash
rg -n "login-page__story|security-flow__stage|teacher-exams__command|exam-studio__canvas" .next/static -g "*.css"
```

Expected: each selector exists in built CSS; Login/MFA and Provas selectors are emitted from their dedicated component stylesheets.

- [ ] **Step 3: Run browser QA against the local production build**

At 1440×900, 1024×768, 768×1024, 390×844, and 360×800:

- verify Login ready, submitting, help, and error states;
- verify the reachable MFA state without exposing QR secrets in screenshots or logs;
- verify exam library loading, filters, search, empty results, cards, and menus;
- verify manual creation through Informações, Questões, Gabarito, and Revisão;
- verify no horizontal overflow, hidden content, console error, or action bar overlap.

- [ ] **Step 4: Review scope before publication**

Run:

```bash
git status --short
git diff --stat origin/main...HEAD
git diff --check origin/main...HEAD
```

Expected: only the approved spec, plan, Login/MFA/Provas presentation files, regression script, and package script are present.

- [ ] **Step 5: Push and open the pull request**

```bash
git push -u origin codex/login-mfa-provas-premium
gh pr create --base main --head codex/login-mfa-provas-premium --title "Redesign Login, MFA and Exams experience" --body "## Resumo
- reformula visualmente Login, MFA e Provas
- preserva dados, textos funcionais, APIs e permissões

## Validação
- testes direcionados de autenticação e provas
- lint e build
- QA responsivo em desktop, tablet e celular"
```

The PR body must list preserved behavior, visual changes, automated commands, and browser viewports tested.

- [ ] **Step 6: Merge only after required checks pass**

Wait for CI, CodeQL, and Vercel preview. Fix failures with a reproducing test, rerun the relevant verification, and merge only when all required checks are green.

- [ ] **Step 7: Verify the production deployment**

Using the existing professor test account, verify published Login, authenticated exam library, a non-destructive traversal of all four editor steps, and the emitted dedicated CSS rules. Leave the user-facing tab on `/dashboard/provas` and report any action intentionally not executed.
