import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const login = read("components/login-form.tsx");
const loginCss = read("components/login-form.css");

assert.match(login, /import "\.\/login-form\.css"/);
assert.match(login, /login-page__story/);
assert.match(login, /login-page__access/);
assert.match(login, /label="Usuário"/);
assert.match(login, /Lembrar neste aparelho/);
assert.match(login, /autoComplete="username"/);
assert.match(login, /autoComplete="current-password"/);
assert.match(login, /loginTeacher\(\{ email, password, remember \}\)/);
assert.match(login, /setSecurityFlow\(true\)/);
assert.match(login, /<AuthSecurityFlow onComplete=/);
assert.match(login, /type="submit"/);
assert.match(loginCss, /@media \(max-width: 1023px\) \{\s*\.login-page \{/);
assert.match(loginCss, /\.login-page__shell \{\s*width: 100%;\s*min-height: calc\(100dvh - 40px\);\s*grid-template-columns: minmax\(0, 1fr\)/);
assert.match(loginCss, /\.login-page__access \{\s*width: min\(100%, 620px\);\s*min-width: 0;/);
assert.match(loginCss, /\.login-page__story \{ display: none; \}/);
assert.match(loginCss, /\.auth-field__control input:focus-visible \{ outline: 0 !important;/);

const security = read("components/auth-security-flow.tsx");
assert.match(security, /import "\.\/auth-security-flow\.css"/);
assert.match(security, /security-flow__stage/);
assert.match(security, /security-flow__qr/);
assert.match(security, /security-flow__recovery/);
assert.match(security, /import CodeSlots from "@\/components\/CodeSlots"/);
assert.match(security, /<CodeSlots length=\{6\}/);
assert.match(security, /onComplete=\{onComplete\}/);
assert.match(security, /accentColor="#5716b0"/);
assert.match(security, /slotSize=\{46\}/);
assert.match(security, /void verify\(nextCode\)/);
for (const endpoint of ["/api/auth/flow", "/api/auth/password", "/api/auth/mfa/method", "/api/auth/mfa/totp", "/api/auth/mfa/recovery"]) {
  assert.match(security, new RegExp(endpoint));
}

const codeSlots = read("components/CodeSlots.jsx");
assert.match(codeSlots, /from 'motion\/react'/);
assert.match(codeSlots, /autoComplete="one-time-code"/);
assert.match(codeSlots, /inputMode="numeric"/);
assert.match(codeSlots, /onPaste=\{onPaste\}/);
assert.match(codeSlots, /useReducedMotion\(\)/);

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
assert.match(exams, /goToStep\(steps\[stepIndex \+ 1\]\.id\)/);
assert.match(exams, /step === "revisao" \? <Button disabled=\{busy\} loading=\{busy\} onClick=\{\(\) => void onSave\("publicar"\)\}/);
const answerEditor = exams.split("function AnswerKeyEditor(")[1]?.split("function ApplicationEditor(")[0] ?? "";
assert.match(answerEditor, /Math\.ceil\(draft\.questions\.length \/ 10\)/);
assert.match(answerEditor, /Mostrar só pendentes/);
assert.doesNotMatch(answerEditor, /question\.prompt/);

const examsCss = read("components/teacher-exams-workspace.css");
assert.match(examsCss, /\.exam-card\.has-open-menu\s*\{[^}]*z-index:\s*40/);
assert.match(examsCss, /\.answer-key-blocks \{ display: grid;/);
assert.match(examsCss, /@media \(max-width: 390px\) \{/);
assert.match(examsCss, /\.teacher-exams__command-actions \{ display: grid; min-width: 0; grid-template-columns: minmax\(0, 1fr\); \}/);
assert.match(examsCss, /@media \(max-width: 1150px\) \{\s*\.exam-studio__layout \{ grid-template-columns: minmax\(0, 1fr\); \}/);
assert.match(examsCss, /\.question-batch__controls \{ min-width: 0; flex: 1 1 360px; flex-wrap: wrap; \}/);
const officialCss = read("components/answer-keys-workspace.css");
assert.match(officialCss, /\.answer-key-detail__sheet ol \{ grid-template-columns: repeat\(auto-fit,/);

console.log("Premium auth and exams UI contract passed.");
