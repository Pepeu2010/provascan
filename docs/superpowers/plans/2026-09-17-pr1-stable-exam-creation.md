# PR 1 — Estabilização de criação de provas: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar o flash/layout shift do comando Criar prova e tornar a autorização de criação centralizada e aplicada pelo backend.

**Architecture:** `lib/access-control.ts` expõe a política pura `canCreateExam`. A sessão do servidor a resolve em `getExamSession`; a rota devolve a capacidade explicitamente e aplica a mesma política no POST. O cliente inicia sem capacidade, reserva o espaço de comando com um skeleton semânticamente neutro enquanto o carregamento estiver pendente e renderiza ações somente após a resposta autorizada.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Supabase service client e scripts TypeScript com `tsx`.

**Spec:** `docs/exam-system-v2.md`

## Global Constraints

- Não criar o cargo `diretor`.
- Não usar `setTimeout`, delay artificial, ou esconder depois de expor o botão.
- O backend é a autoridade final; interface não concede permissão.
- Preservar o fluxo atual de professor e o layout responsivo.
- Não criar migration neste PR.

---

### Task 1: Política de criação e sessão estável

**Files:**

- Modify: `lib/access-control.ts`
- Modify: `lib/teacher-exam-session.ts`
- Test: `scripts/verify-exam-create-permissions.ts`

**Interfaces:**

- Produces: `canCreateExam(role: UserRole): boolean`.
- Produces: `getExamSession(): { id, name, role, institutionalView, canCreateExam } | null`.

- [ ] **Step 1: Criar teste de contrato da política**

```ts
assert.equal(canCreateExam("admin"), true);
assert.equal(canCreateExam("vice_diretor"), true);
assert.equal(canCreateExam("coordenador"), true);
assert.equal(canCreateExam("professor"), true);
assert.equal(canCreateExam("desconhecido"), false);
```

- [ ] **Step 2: Executar o teste e confirmar falha**

Run: `npx --no-install tsx scripts/verify-exam-create-permissions.ts`  
Expected: falha porque `canCreateExam` ainda não existe.

- [ ] **Step 3: Implementar a política pura e projetá-la na sessão**

```ts
export function canCreateExam(role: UserRole) {
  return role === "professor" || isAcademicManagementRole(role);
}
```

Importar essa função em `getExamSession` e expor a capacidade resolvida no
objeto de sessão.

- [ ] **Step 4: Executar o teste de contrato**

Run: `npx --no-install tsx scripts/verify-exam-create-permissions.ts`  
Expected: PASS.

### Task 2: Rota com capacidade explícita e proteção de escrita

**Files:**

- Modify: `app/api/teacher-exams/route.ts`
- Test: `scripts/verify-exam-create-permissions.ts`

**Interfaces:**

- Consumes: `session.canCreateExam`.
- Produces: GET `{ exams, capabilities: { canCreateExam } }`.
- Enforces: POST recusa sessão sem `canCreateExam` com HTTP 403.

- [ ] **Step 1: Estender o teste com contrato de rota**

```ts
assert.match(route, /capabilities:\s*\{\s*canCreateExam:/);
assert.match(route, /!session\?\.canCreateExam/);
```

- [ ] **Step 2: Executar o teste e confirmar falha**

Run: `npx --no-install tsx scripts/verify-exam-create-permissions.ts`  
Expected: falha porque a rota ainda usa `session.role !== "professor"`.

- [ ] **Step 3: Retornar a capacidade e usar a mesma fonte no POST**

```ts
return NextResponse.json({
  exams,
  capabilities: { canCreateExam: session.canCreateExam },
});
```

Substituir a guarda exclusiva de professor por `!session?.canCreateExam`.
Conservar CSRF, rate limit, validação Zod e auditoria.

- [ ] **Step 4: Executar o teste**

Run: `npx --no-install tsx scripts/verify-exam-create-permissions.ts`  
Expected: PASS.

### Task 3: Workspace sem flash e sem layout shift

**Files:**

- Modify: `components/teacher-exams-workspace.tsx`
- Modify: `components/teacher-exams-workspace.css`
- Test: `scripts/verify-exam-create-permissions.ts`
- Test: `scripts/verify-premium-auth-exams-ui.ts`

**Interfaces:**

- Consumes: GET `capabilities.canCreateExam`.
- Produces: `ExamCreationActions` e `ExamCreationActionsSkeleton`.

- [ ] **Step 1: Estender o teste de interface**

```ts
assert.match(workspace, /canCreateExam/);
assert.match(workspace, /ExamCreationActionsSkeleton/);
assert.doesNotMatch(workspace, /setTimeout\(\(\) => void load\(\), 0\)/);
```

- [ ] **Step 2: Executar os testes e confirmar falha**

Run: `npx --no-install tsx scripts/verify-exam-create-permissions.ts && npx --no-install tsx scripts/verify-premium-auth-exams-ui.ts`  
Expected: falha porque o workspace usa `readOnly` e carga agendada.

- [ ] **Step 3: Implementar estado seguro por padrão**

```tsx
const [canCreateExam, setCanCreateExam] = useState(false);
const [permissionsResolved, setPermissionsResolved] = useState(false);
```

Carregar diretamente em `useEffect`, sem timer. Atualizar as capacidades e
`permissionsResolved` somente quando a resposta autenticada chega. Durante
carregamento, renderizar skeleton no mesmo contêiner e com as mesmas dimensões
das ações finais. Depois da resolução, renderizar ações somente quando
`canCreateExam` for verdadeiro. Substituir guards `readOnly` de criação e
edição pelo capability apropriado neste PR; manter a visão institucional atual
para a listagem.

- [ ] **Step 4: Adicionar CSS de espaço estável**

```css
.teacher-exams__command-actions {
  min-height: 44px;
}
```

O skeleton deve ter as mesmas duas células de ação no desktop e empilhar no
mobile conforme o layout final, sem conteúdo acionável.

- [ ] **Step 5: Executar testes de contrato e UI**

Run: `npx --no-install tsx scripts/verify-exam-create-permissions.ts && npx --no-install tsx scripts/verify-premium-auth-exams-ui.ts && npx --no-install tsx scripts/verify-teacher-exam-flow.ts`  
Expected: PASS.

### Task 4: Verificação de regressão e entrega

**Files:**

- Modify: `scripts/verify-api-authorization.ts` se o contrato atual precisar
  refletir a capacidade nova.

- [ ] **Step 1: Executar verificações focadas**

Run: `npm run test:api-authorization && npm run test:teacher-exam-flow && npm run test:premium-auth-exams-ui && npx --no-install tsx scripts/verify-exam-create-permissions.ts`  
Expected: PASS.

- [ ] **Step 2: Executar qualidade estática**

Run: `npm run lint && npm run build && git diff --check`  
Expected: PASS.

- [ ] **Step 3: Revisar o diff e registrar o PR**

Confirmar que nenhum migration foi criado, que o POST continua protegido e que
nenhum `setTimeout` novo foi usado para permissão ou carga da criação.

- [ ] **Step 4: Commit**

```bash
git add lib/access-control.ts lib/teacher-exam-session.ts app/api/teacher-exams/route.ts components/teacher-exams-workspace.tsx components/teacher-exams-workspace.css scripts/verify-exam-create-permissions.ts
git commit -m "fix: stabilize exam creation permissions"
```
