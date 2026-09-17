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

console.log("Premium auth and exams UI contract passed.");
