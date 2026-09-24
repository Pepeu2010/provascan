import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const tsxCli = fileURLToPath(import.meta.resolve("tsx/cli"));
const tests = [
  "verify-exam-create-permissions",
  "verify-exam-assignments",
  "verify-assigned-exam-access",
  "verify-exam-subjects-scopes",
  "verify-teacher-exam-flow",
  "verify-teacher-home",
  "verify-api-authorization",
  "verify-fanucchi-answer-sheet",
  "verify-exam-printing",
  "verify-print-preflight",
  "verify-omr-ground-truth",
  "verify-universal-document",
  "verify-universal-sheet-validation",
  "verify-universal-correction-flow",
  "verify-correction-ocr-safety",
  "verify-auth-flow",
  "verify-internal-reporting",
  "verify-external-reporting",
  "verify-offline-sync-queue",
];

for (const test of tests) {
  process.stdout.write(`\n[critical] ${test}\n`);
  const result = spawnSync(process.execPath, [tsxCli, `scripts/${test}.ts`], {
    cwd: projectRoot,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.stderr.write(`\n[critical] Falhou: ${test}\n`);
    process.exit(result.status ?? 1);
  }
}

process.stdout.write(`\n[critical] ${tests.length} verificações passaram.\n`);
