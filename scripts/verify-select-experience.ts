import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const selectSource = readFileSync(resolve(process.cwd(), "components/ui/select.tsx"), "utf8");
const stylesSource = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

for (const requiredFragment of [
  "role=\"listbox\"",
  "role=\"option\"",
  "aria-selected={isSelected}",
  "app-select__trigger",
  "app-select__panel",
  "onKeyDown",
]) {
  assert.match(selectSource, new RegExp(requiredFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

for (const requiredFragment of [
  ".app-select__trigger",
  ".app-select__panel",
  ".app-select__option--selected",
  "@media (prefers-reduced-motion: reduce)",
]) {
  assert.match(stylesSource, new RegExp(requiredFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

console.log("Shared select experience checks passed.");
