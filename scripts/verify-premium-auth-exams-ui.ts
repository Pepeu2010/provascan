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
assert.match(login, /loginTeacher\(\{ email, password, remember \}\)/);
assert.match(login, /setSecurityFlow\(true\)/);
assert.match(login, /<AuthSecurityFlow onComplete=/);
assert.match(login, /type="submit"/);

const security = read("components/auth-security-flow.tsx");
assert.match(security, /import "\.\/auth-security-flow\.css"/);
assert.match(security, /security-flow__stage/);
assert.match(security, /security-flow__qr/);
assert.match(security, /security-flow__recovery/);
assert.match(security, /className="absolute inset-0 cursor-text opacity-0"/);
assert.equal((security.match(/<input/g) ?? []).length >= 2, true);
for (const endpoint of ["/api/auth/flow", "/api/auth/password", "/api/auth/mfa/method", "/api/auth/mfa/totp", "/api/auth/mfa/recovery"]) {
  assert.match(security, new RegExp(endpoint));
}

const exams = read("components/teacher-exams-workspace.tsx");
assert.match(exams, /import "\.\/teacher-exams-workspace\.css"/);
assert.match(exams, /teacher-exams__command/);
assert.match(exams, /teacher-exams__filters/);
assert.match(exams, /exam-card__primary/);
assert.match(exams, /ExamListSkeleton/);
assert.match(exams, /Nenhuma prova corresponde aos filtros/);
assert.match(exams, /Sua primeira prova começa aqui/);
assert.match(exams, /creation-hub/);
assert.match(exams, /creation-hub__option/);
assert.match(exams, /accept="\.pdf,\.doc,\.docx,\.jpg,\.jpeg,\.png"/);
assert.match(exams, /if \(file\) void onImport\(file\)/);
assert.match(exams, /onManual/);
for (const label of ["Informações", "Questões", "Gabarito", "Revisão"]) {
  assert.match(exams, new RegExp(label));
}
assert.match(exams, /exam-studio__rail/);
assert.match(exams, /exam-studio__canvas/);
assert.match(exams, /question-block/);
assert.match(exams, /publish-checklist/);
assert.match(exams, /validateExamForPublication\(draft\)/);
assert.match(exams, /window\.localStorage\.setItem\(LOCAL_DRAFT_KEY/);
assert.match(exams, /onSave\("rascunho"\)/);
assert.match(exams, /onSave\("publicar"\)/);
assert.match(exams, /menu \? "has-open-menu" : ""/);

const examsCss = read("components/teacher-exams-workspace.css");
assert.match(examsCss, /\.exam-card\.has-open-menu\s*\{[^}]*z-index:\s*40/);

console.log("Premium auth and exams UI contract passed.");
