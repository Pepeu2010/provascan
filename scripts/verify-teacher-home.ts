import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const dashboardPage = read("app/dashboard/page.tsx");
const workspace = read("components/dashboard-workspace.tsx");
const shell = read("components/dashboard-shell.tsx");

assert.match(dashboardPage, /requireProtectedPage\("\/dashboard"\)/);
assert.match(dashboardPage, /<DashboardWorkspace\s*\/>/);
assert.doesNotMatch(dashboardPage, /redirect\("\/dashboard\/minhas-provas"\)/);
assert.match(workspace, /session\?\.role === "professor"/);
assert.match(workspace, /state === "error"/);
assert.match(workspace, /Tentar novamente/);
assert.match(workspace, /Correções salvas/);
assert.match(shell, /session\?\.role === "professor" && active === "\/dashboard"/);
console.log("Teacher home routing and loading states verified.");
