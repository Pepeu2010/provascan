import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../components/dashboard-workspace.tsx", import.meta.url), "utf8");

assert.match(workspace, /className="dashboard-worklist__row"/);
assert.match(workspace, /className="min-w-0 flex-1"/);
assert.match(workspace, /className="dashboard-row-action"/);

const mobileRules = css.slice(css.lastIndexOf("@media (max-width: 767px)"));
assert.match(mobileRules, /\.dashboard-worklist__row \{ flex-wrap: wrap; \}/);
assert.match(mobileRules, /\.dashboard-worklist__row > \.min-w-0\.flex-1 \{ flex-basis: calc\(100% - 54px\); \}/);
assert.match(mobileRules, /\.dashboard-row-action \{ width: calc\(100% - 54px\); min-height: 52px;[^}]*font-size: 16px;/);

console.log("Dashboard responsive card checks passed.");
