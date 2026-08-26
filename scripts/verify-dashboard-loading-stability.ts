import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const loading = readFileSync(new URL("../app/dashboard/loading.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/dashboard-shell.tsx", import.meta.url), "utf8");

assert.match(loading, /dashboard-loading--shell/);
assert.match(loading, /dashboard-loading__sidebar/);
assert.match(loading, /dashboard-loading__main/);
assert.match(shell, /<DashboardLoading active=\{active\} \/>/);

console.log("Dashboard loading stability checks passed.");
